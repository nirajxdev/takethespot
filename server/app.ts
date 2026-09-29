import express from "express";
import type { Request, Response } from "express";
import {
  compactPlotsForClient,
  createEmptyPlots,
  mergeConfig,
  refreshExpirations,
} from "./market.ts";
import { getPersistence, getStore } from "./store.ts";
import type { PendingCheckout, Plot, Transaction } from "../src/types.ts";
import {
  dodoCheckoutMissing,
  getAppBaseUrl,
  getDodoClient,
  getDodoProductId,
  getDodoWebhookSecret,
  headerValue,
} from "./dodo.ts";
import {
  completePurchase,
  quotePurchaseDetails,
  quotePurchaseTotal,
  type PurchaseResult,
} from "./purchase.ts";
import { handleAdminLogin, requireAdmin } from "./admin.ts";

function getExpress() {
  return ((express as unknown as { default?: typeof express }).default ??
    express) as typeof express;
}

function setBoardCache(res: Response) {
  // s-maxage must exceed the client poll interval, otherwise the CDN entry
  // expires before the next poll and every request reaches the database.
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
  );
}

function paymentCoversExpected(
  payment: {
    currency?: string;
    total_amount?: number;
    settlement_amount?: number;
    settlement_currency?: string;
  },
  expectedUsdCents: number,
) {
  if (payment.settlement_currency === "USD" && typeof payment.settlement_amount === "number") {
    return payment.settlement_amount >= expectedUsdCents;
  }
  if (payment.currency === "USD" && typeof payment.total_amount === "number") {
    return payment.total_amount >= expectedUsdCents;
  }
  // INR / adaptive: do not compare paise to USD cents.
  return typeof payment.total_amount === "number" && payment.total_amount > 0;
}

function publicError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : fallback;
  if (/DATABASE_URL/i.test(msg)) return msg;
  if (/cannot find module/i.test(msg)) return fallback;
  if (/connect|password|enotfound|ssl|postgres|ECONN|fetch failed/i.test(msg)) {
    return `${fallback}. Database connection failed. Check DATABASE_URL in the Vercel project Environment Variables.`;
  }
  return fallback;
}

async function loadConfig() {
  const store = await getStore();
  return mergeConfig(await store.getConfig());
}

async function loadPlots() {
  const store = await getStore();
  const existing = await store.getPlots();
  if (existing) return existing;
  const config = await loadConfig();
  const plots = createEmptyPlots(config);
  await store.setPlots(plots);
  return plots;
}

async function savePlots(plots: Plot[]) {
  await (await getStore()).setPlots(plots);
}

async function loadTransactions(): Promise<Transaction[]> {
  return (await getStore()).getTransactions();
}

async function getCheckoutMap() {
  return (await getStore()).getCheckouts();
}

async function saveCheckout(checkout: PendingCheckout) {
  const store = await getStore();
  const all = await store.getCheckouts();
  all[checkout.id] = checkout;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [id, row] of Object.entries(all)) {
    if (new Date(row.createdAt).getTime() < cutoff && row.status !== "pending") {
      delete all[id];
    }
  }
  await store.setCheckouts(all);
}

function rawBodyToString(body: unknown): string {
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof body === "string") return body;
  return JSON.stringify(body ?? {});
}

function checkoutIdFromMeta(
  meta: { [key: string]: string | number | boolean } | undefined,
): string {
  if (!meta) return "";
  const value = meta.tts_checkout_id ?? meta.checkout_id;
  return typeof value === "string" ? value : "";
}

async function fulfillCheckout(
  checkout: PendingCheckout,
  paymentId: string,
): Promise<PurchaseResult> {
  if (checkout.status === "completed") {
    return {
      ok: true,
      updatedPlots: [],
      totalCost: checkout.expectedAmount,
      manageToken: checkout.manageToken,
      quote: {
        availableCount: 0,
        availableTotal: 0,
        takeoverCount: 0,
        takeoverTotal: 0,
        totalCost: checkout.expectedAmount,
        items: [],
      },
    };
  }

  const quoteRes = await quotePurchaseDetails(
    checkout.plotIds,
    checkout.ownerId,
    mergeConfig,
  );
  if (quoteRes.ok === false) {
    checkout.status = "failed";
    checkout.paymentId = paymentId;
    checkout.error = quoteRes.error;
    await saveCheckout(checkout);
    return quoteRes;
  }

  if (quoteRes.quote.totalCost > checkout.expectedAmount) {
    checkout.status = "failed";
    checkout.paymentId = paymentId;
    checkout.error = `Plot prices changed (${quoteRes.quote.totalCost} cents due, paid ${checkout.expectedAmount}).`;
    await saveCheckout(checkout);
    return { ok: false, status: 409, error: checkout.error };
  }

  const result = await completePurchase(
    {
      plotIds: checkout.plotIds,
      ownerId: checkout.ownerId,
      brandName: checkout.brandName,
      logo: checkout.logo,
      websiteUrl: checkout.websiteUrl,
      manageToken: checkout.manageToken,
    },
    mergeConfig,
  );

  if (result.ok === false) {
    checkout.status = "failed";
    checkout.paymentId = paymentId;
    checkout.error = result.error;
    await saveCheckout(checkout);
    return result;
  }

  checkout.status = "completed";
  checkout.paymentId = paymentId;
  checkout.completedAt = new Date().toISOString();
  checkout.error = undefined;
  await saveCheckout(checkout);
  return result;
}

export function createApiApp() {
  const expressLib = getExpress();
  const app = expressLib();

  // Production webhook URL (Dodo dashboard → Developer → Webhooks):
  // https://takethespot.lol/api/webhooks/dodo
  // Local: use a tunnel to the same path. Verify Standard Webhooks headers:
  // webhook-id, webhook-signature, webhook-timestamp. Event: payment.succeeded.
  app.post(
    "/api/webhooks/dodo",
    expressLib.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const webhookSecret = getDodoWebhookSecret();
        const client = getDodoClient();
        if (!webhookSecret || !client) {
          return res.status(503).json({
            error:
              "Dodo webhook secret is not configured (DODO_PAYMENTS_WEBHOOK_KEY or DODO_WEBHOOK_SECRET).",
          });
        }

        const raw = rawBodyToString(req.body);
        let event;
        try {
          event = client.webhooks.unwrap(raw, {
            headers: {
              "webhook-id": headerValue(req.headers, "webhook-id"),
              "webhook-signature": headerValue(req.headers, "webhook-signature"),
              "webhook-timestamp": headerValue(
                req.headers,
                "webhook-timestamp",
              ),
            },
            key: webhookSecret,
          });
        } catch (err) {
          console.error("Dodo webhook signature failed", err);
          return res.status(401).json({ error: "Invalid webhook signature" });
        }

        if (event.type === "payment.failed" || event.type === "payment.cancelled") {
          const checkoutId = checkoutIdFromMeta(event.data.metadata);
          if (checkoutId) {
            const all = await getCheckoutMap();
            const checkout = all[checkoutId];
            if (checkout && checkout.status === "pending") {
              checkout.status = "failed";
              checkout.paymentId = event.data.payment_id;
              checkout.error = event.type;
              await saveCheckout(checkout);
            }
          }
          return res.status(200).json({ received: true });
        }

        if (event.type !== "payment.succeeded") {
          return res.status(200).json({ received: true });
        }

        const payment = event.data;
        const checkoutId = checkoutIdFromMeta(payment.metadata);

        if (!checkoutId) {
          console.error("Dodo payment.succeeded missing tts_checkout_id metadata", payment.payment_id);
          return res.status(200).json({ received: true, ignored: true });
        }

        const all = await getCheckoutMap();
        const checkout = all[checkoutId];
        if (!checkout) {
          console.error("Dodo webhook: unknown checkout", checkoutId);
          return res.status(200).json({ received: true, ignored: true });
        }

        if (checkout.status === "completed") {
          return res.status(200).json({ received: true, duplicate: true });
        }

        if (
          !paymentCoversExpected(payment, checkout.expectedAmount)
        ) {
          checkout.status = "failed";
          checkout.paymentId = payment.payment_id;
          checkout.error = `Paid ${payment.total_amount} ${payment.currency} but expected ${checkout.expectedAmount} USD cents`;
          await saveCheckout(checkout);
          console.error(checkout.error);
          return res.status(200).json({ received: true, fulfilled: false });
        }

        const result = await fulfillCheckout(checkout, payment.payment_id);
        if (result.ok === false) {
          console.error("Dodo fulfill failed", result.error);
        }
        return res.status(200).json({ received: true, fulfilled: result.ok });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: publicError(e, "Webhook handler failed") });
      }
    },
  );

  app.use(expressLib.json({ limit: "10mb" }));

  async function sendBoard(res: Response) {
    const [config, plots] = await Promise.all([loadConfig(), loadPlots()]);
    if (refreshExpirations(plots)) {
      await savePlots(plots);
    }
    const persistence = getPersistence();
    setBoardCache(res);
    return {
      plots: compactPlotsForClient(plots),
      config: {
        ...config,
        persistence: persistence.mode,
        persistenceWarning: persistence.warning,
      },
    };
  }

  app.get("/api/board", async (_req, res) => {
    try {
      res.json(await sendBoard(res));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load board") });
    }
  });

  app.get("/api/config", async (_req, res) => {
    try {
      await getStore();
      const persistence = getPersistence();
      setBoardCache(res);
      res.json({
        ...(await loadConfig()),
        persistence: persistence.mode,
        persistenceWarning: persistence.warning,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load config") });
    }
  });

  app.get("/api/plots", async (_req, res) => {
    try {
      const plots = await loadPlots();
      if (refreshExpirations(plots)) {
        await savePlots(plots);
      }
      setBoardCache(res);
      res.json(compactPlotsForClient(plots));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load plots") });
    }
  });

  app.get("/api/transactions/recent", async (_req, res) => {
    try {
      const txs = await loadTransactions();
      const recent = txs
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 3);
      res.json(recent);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load transactions") });
    }
  });

  app.get("/api/plots/:id/transactions", async (req, res) => {
    try {
      const txs = await loadTransactions();
      const plotTxs = txs
        .filter((tx) => tx.plotId === req.params.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      res.json(plotTxs);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load transactions") });
    }
  });

  app.get("/api/extract-metadata", async (req, res) => {
    try {
      const rawUrl = String(req.query.url ?? "").trim();
      if (!rawUrl) {
        return res.status(400).json({ error: "URL is required" });
      }

      let targetUrl = rawUrl;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const domain = parsedUrl.hostname;
      const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TakeTheSpotBot/1.0; +https://takethespot.lol)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/*;q=0.8,*/*;q=0.7",
          },
          redirect: "follow",
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return res.json({
            success: true,
            domain,
            title: domain.replace(/^www\./, ""),
            logoUrl: googleFavicon,
            faviconUrl: googleFavicon,
          });
        }

        const html = await response.text();

        // Extract Title / Site Name
        let title = "";
        const ogSiteNameMatch = html.match(/<meta\s+[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
        if (ogSiteNameMatch && ogSiteNameMatch[1]) {
          title = ogSiteNameMatch[1].trim();
        }

        if (!title) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim().split(/[|\-–—]/)[0].trim();
          }
        }

        if (!title) {
          title = domain.replace(/^www\./, "");
        }

        // Helper to resolve URL
        const resolve = (rel: string) => {
          try {
            return new URL(rel, targetUrl).href;
          } catch {
            return null;
          }
        };

        // Extract Apple Touch Icon
        let appleTouchIcon: string | null = null;
        const appleMatch = html.match(/<link\s+[^>]*rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*href=["']([^"']+)["']/i)
          || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i);
        if (appleMatch && appleMatch[1]) {
          appleTouchIcon = resolve(appleMatch[1]);
        }

        // Extract Favicon / Icon
        let faviconUrl: string | null = null;
        const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i)
          || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i);
        if (iconMatch && iconMatch[1]) {
          faviconUrl = resolve(iconMatch[1]);
        }

        // Extract OG Image
        let ogImage: string | null = null;
        const ogImageMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          ogImage = resolve(ogImageMatch[1]);
        }

        // Selected best visual in priority order: apple touch icon > favicon > ogImage > google favicon
        const bestVisual = appleTouchIcon || faviconUrl || ogImage || googleFavicon;

        return res.json({
          success: true,
          domain,
          title,
          logoUrl: bestVisual,
          appleTouchIcon,
          faviconUrl: faviconUrl || googleFavicon,
          ogImage,
        });
      } catch {
        // Safe fallback if fetch fails or times out
        return res.json({
          success: true,
          domain,
          title: domain.replace(/^www\./, ""),
          logoUrl: googleFavicon,
          faviconUrl: googleFavicon,
        });
      }
    } catch (e) {
      console.error("extract-metadata error:", e);
      return res.status(500).json({ error: "Failed to extract metadata" });
    }
  });

  app.post("/api/admin/login", handleAdminLogin);

  app.post("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const current = await loadConfig();
      const next = mergeConfig({ ...current, ...req.body });
      await (await getStore()).setConfig(next);
      res.json({ success: true, config: next });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to update config") });
    }
  });

  app.post("/api/admin/revoke", requireAdmin, async (req, res) => {
    try {
      const { plotId } = req.body;
      if (!plotId) return res.status(400).json({ error: "plotId is required" });

      const config = await loadConfig();
      const plots = await loadPlots();
      const plot = plots.find((p) => p.id === plotId);
      if (!plot) return res.status(404).json({ error: "Plot not found" });

      plot.status = "available";
      plot.ownerId = null;
      plot.brandName = null;
      plot.logo = null;
      plot.websiteUrl = null;
      plot.currentPrice = config.initialPrice;
      plot.purchasedAt = null;
      plot.expiresAt = null;

      await savePlots(plots);
      res.json({ success: true, plot });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to revoke plot") });
    }
  });

  // 1. Authoritative Pricing Quote Endpoint
  app.post("/api/quote", async (req: Request, res: Response) => {
    try {
      const { plotIds, ownerId } = req.body ?? {};
      const quoteRes = await quotePurchaseDetails(
        plotIds,
        String(ownerId ?? ""),
        mergeConfig,
      );
      if (quoteRes.ok === false) {
        return res.status(quoteRes.status).json({ error: quoteRes.error });
      }
      res.json({ ok: true, quote: quoteRes.quote });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to calculate quote") });
    }
  });

  // 2. Real Live Billboard Statistics & Contested Spots
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const [plots, txs] = await Promise.all([loadPlots(), loadTransactions()]);
      if (refreshExpirations(plots)) {
        await savePlots(plots);
      }

      const totalSpots = plots.length;
      const claimedSpots = plots.filter((p) => p.status === "owned").length;
      const availableSpots = totalSpots - claimedSpots;
      
      const totalVolume = txs.reduce((sum, tx) => sum + (tx.transactionAmount || 0), 0);
      const totalAcquisitions = txs.filter((tx) => Boolean(tx.previousOwner)).length;

      // Most valuable active spots (highest current listed price)
      const mostValuableSpots = [...plots]
        .filter((p) => p.status === "owned")
        .sort((a, b) => b.currentPrice - a.currentPrice)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          brandName: p.brandName,
          logo: p.logo,
          websiteUrl: p.websiteUrl,
          currentPrice: p.currentPrice,
          takeoverPrice: Math.round(p.currentPrice * 2.5),
          expiresAt: p.expiresAt,
        }));

      // Most contested spots (by number of transactions)
      const spotTxCounts: Record<string, number> = {};
      for (const tx of txs) {
        spotTxCounts[tx.plotId] = (spotTxCounts[tx.plotId] || 0) + 1;
      }
      const mostContestedSpots = Object.entries(spotTxCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([plotId, count]) => {
          const p = plots.find((plot) => plot.id === plotId);
          return {
            id: plotId,
            acquisitionsCount: count,
            brandName: p?.brandName ?? null,
            logo: p?.logo ?? null,
            websiteUrl: p?.websiteUrl ?? null,
            currentPrice: p?.currentPrice ?? 100,
            status: p?.status ?? "available",
          };
        });

      // Recent unique active brands for the Discover showcase
      const seenBrands = new Set<string>();
      const recentBrands: {
        id: string;
        brandName: string;
        logo: string | null;
        websiteUrl: string | null;
        spotsCount: number;
        spotIds: string[];
        purchasedAt: string | null;
      }[] = [];

      // Group active plots by owner/brand
      const brandPlotMap: Record<string, Plot[]> = {};
      for (const p of plots) {
        if (p.status === "owned" && p.brandName) {
          const key = p.brandName.trim().toLowerCase();
          if (!brandPlotMap[key]) brandPlotMap[key] = [];
          brandPlotMap[key].push(p);
        }
      }

      for (const group of Object.values(brandPlotMap)) {
        const first = group[0];
        if (!first.brandName) continue;
        recentBrands.push({
          id: first.id,
          brandName: first.brandName,
          logo: first.logo,
          websiteUrl: first.websiteUrl,
          spotsCount: group.length,
          spotIds: group.map((p) => p.id),
          purchasedAt: first.purchasedAt,
        });
      }

      recentBrands.sort((a, b) => {
        const timeA = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
        const timeB = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
        return timeB - timeA;
      });

      setBoardCache(res);
      res.json({
        totalSpots,
        claimedSpots,
        availableSpots,
        totalVolume,
        totalAcquisitions,
        acquisitionsCount: totalAcquisitions,
        mostValuableSpots,
        mostContestedSpots,
        recentBrands: recentBrands.slice(0, 12),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load stats") });
    }
  });

  // 3. Single Spot Details for Shareable Links (/spot/:id)
  app.get("/api/plots/:id", async (req: Request, res: Response) => {
    try {
      const plotId = String(req.params.id || "").toUpperCase();
      const [plots, txs, config] = await Promise.all([loadPlots(), loadTransactions(), loadConfig()]);
      if (refreshExpirations(plots)) {
        await savePlots(plots);
      }

      const plot = plots.find((p) => p.id.toUpperCase() === plotId);
      if (!plot) {
        return res.status(404).json({ error: `Spot ${plotId} not found` });
      }

      const spotTxs = txs
        .filter((tx) => tx.plotId.toUpperCase() === plotId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setBoardCache(res);
      res.json({
        plot: {
          id: plot.id,
          row: plot.row,
          col: plot.col,
          status: plot.status,
          ownerId: plot.ownerId,
          brandName: plot.brandName,
          logo: plot.logo,
          websiteUrl: plot.websiteUrl,
          currentPrice: plot.currentPrice,
          takeoverPrice: plot.status === "owned"
            ? Math.round(plot.currentPrice * config.takeoverMultiplier)
            : plot.currentPrice,
          purchasedAt: plot.purchasedAt,
          expiresAt: plot.expiresAt,
        },
        transactions: spotTxs,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load spot details") });
    }
  });

  // 4. Secure Private Management API
  app.get("/api/manage/:token", async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token ?? "").trim();
      if (!token || token.length < 16) {
        return res.status(401).json({ error: "Invalid management token" });
      }

      const plots = await loadPlots();
      if (refreshExpirations(plots)) {
        await savePlots(plots);
      }

      const ownedPlots = plots.filter(
        (p) => p.status === "owned" && p.manageToken === token,
      );

      if (ownedPlots.length === 0) {
        return res.status(404).json({
          error: "No active spots found for this management token. They may have expired or been acquired.",
        });
      }

      res.json({
        ok: true,
        plots: compactPlotsForClient(ownedPlots),
        brandName: ownedPlots[0].brandName,
        websiteUrl: ownedPlots[0].websiteUrl,
        logo: ownedPlots[0].logo,
        expiresAt: ownedPlots[0].expiresAt,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load management view") });
    }
  });

  app.post("/api/manage/:token", async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token ?? "").trim();
      if (!token || token.length < 16) {
        return res.status(401).json({ error: "Invalid management token" });
      }

      const { brandName, websiteUrl, logo } = req.body ?? {};
      const plots = await loadPlots();
      if (refreshExpirations(plots)) {
        await savePlots(plots);
      }

      const ownedPlots = plots.filter(
        (p) => p.status === "owned" && p.manageToken === token,
      );

      if (ownedPlots.length === 0) {
        return res.status(404).json({
          error: "No active spots found for this management token to update.",
        });
      }

      for (const plot of ownedPlots) {
        if (typeof brandName === "string" && brandName.trim()) {
          plot.brandName = brandName.trim();
        }
        if (typeof websiteUrl === "string") {
          plot.websiteUrl = websiteUrl.trim();
        }
        if (typeof logo === "string") {
          plot.logo = logo.trim();
        }
      }

      await savePlots(plots);

      res.json({
        ok: true,
        updatedCount: ownedPlots.length,
        plots: compactPlotsForClient(ownedPlots),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to update managed spots") });
    }
  });

  // 5. Checkout Creation
  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const missing = dodoCheckoutMissing();
      if (missing) {
        return res.status(503).json({ error: missing });
      }

      const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body ?? {};
      const quoteRes = await quotePurchaseDetails(
        plotIds,
        String(ownerId ?? ""),
        mergeConfig,
      );
      if (quoteRes.ok === false) {
        return res.status(quoteRes.status).json({ error: quoteRes.error });
      }

      const quote = quoteRes.quote;
      if (quote.totalCost < 100) {
        return res.status(400).json({ error: "Checkout amount must be at least $1.00." });
      }

      const client = getDodoClient();
      const productId = getDodoProductId();
      if (!client || !productId) {
        return res.status(503).json({
          error: "Dodo Payments is not configured.",
        });
      }

      const checkoutId = crypto.randomUUID();
      const manageToken = crypto.randomUUID();
      const returnUrl = `${getAppBaseUrl(req)}/?paid=1&checkout=${encodeURIComponent(checkoutId)}`;
      const cancelUrl = `${getAppBaseUrl(req)}/?paid=0`;

      const billingCurrency = process.env.DODO_BILLING_CURRENCY?.trim().toUpperCase();

      const itemizedPrices: Record<string, number> = {};
      quote.items.forEach((item) => {
        itemizedPrices[item.plotId] = item.priceDue;
      });

      const session = await client.checkoutSessions.create({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: quote.totalCost,
          },
        ],
        ...(billingCurrency === "USD" || billingCurrency === "INR"
          ? { billing_currency: billingCurrency }
          : {}),
        return_url: returnUrl,
        cancel_url: cancelUrl,
        metadata: {
          tts_checkout_id: checkoutId,
        },
        feature_flags: {
          redirect_immediately: true,
          allow_currency_selection: true,
          allow_customer_editing_country: true,
        },
      });

      if (!session.checkout_url) {
        return res.status(502).json({
          error: "Dodo did not return a checkout URL. Check DODO_PRODUCT_ID and API keys.",
        });
      }

      const pending: PendingCheckout = {
        id: checkoutId,
        dodoSessionId: session.session_id,
        plotIds,
        itemizedPrices,
        ownerId: String(ownerId ?? ""),
        brandName: String(brandName ?? ""),
        logo: String(logo ?? ""),
        websiteUrl: String(websiteUrl ?? ""),
        expectedAmount: quote.totalCost,
        manageToken,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await saveCheckout(pending);

      res.json({
        checkoutId,
        sessionId: session.session_id,
        checkoutUrl: session.checkout_url,
        amount: quote.totalCost,
        quote,
        manageToken,
      });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to create checkout";
      res.status(502).json({
        error: `Could not start Dodo checkout. ${msg}`,
      });
    }
  });

  // 6. Checkout Polling
  app.get("/api/checkout/:id", async (req: Request, res: Response) => {
    try {
      const all = await getCheckoutMap();
      const checkout = all[req.params.id];
      if (!checkout) {
        return res.status(404).json({ error: "Checkout not found" });
      }

      res.json({
        id: checkout.id,
        status: checkout.status,
        plotIds: checkout.plotIds,
        ownerId: checkout.ownerId,
        brandName: checkout.brandName,
        expectedAmount: checkout.expectedAmount,
        manageToken: checkout.status === "completed" ? checkout.manageToken : undefined,
        error: checkout.error ?? null,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load checkout") });
    }
  });

  app.post("/api/purchase", async (req: Request, res: Response) => {
    try {
      if (process.env.ALLOW_DIRECT_PURCHASE !== "true") {
        return res.status(403).json({
          error:
            "Direct purchase is disabled. Pay via Dodo (POST /api/checkout); ownership is granted by the webhook.",
        });
      }

      const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body;
      const result = await completePurchase(
        { plotIds, ownerId, brandName, logo, websiteUrl },
        mergeConfig,
      );
      if (result.ok === false) {
        return res.status(result.status).json({ error: result.error });
      }
      res.json({
        success: true,
        updatedPlots: result.updatedPlots,
        totalCost: result.totalCost,
        manageToken: result.manageToken,
        quote: result.quote,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to complete purchase") });
    }
  });

  return app;
}
