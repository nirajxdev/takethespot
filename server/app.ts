import express from "express";
import type { Request, Response } from "express";
import {
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
import { completePurchase, quotePurchaseTotal, type PurchaseResult } from "./purchase.ts";

function getExpress() {
  return ((express as unknown as { default?: typeof express }).default ??
    express) as typeof express;
}

function publicError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : fallback;
  if (/DATABASE_URL/i.test(msg)) return msg;
  if (/connect|password|enotfound|ssl|neon|postgres/i.test(msg)) {
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
    return { ok: true, updatedPlots: [], totalCost: 0 };
  }

  const quote = await quotePurchaseTotal(
    checkout.plotIds,
    checkout.ownerId,
    mergeConfig,
  );
  if (quote.ok && quote.totalCost > checkout.expectedAmount) {
    checkout.status = "failed";
    checkout.paymentId = paymentId;
    checkout.error = `Plot prices changed (${quote.totalCost} cents due, paid ${checkout.expectedAmount}).`;
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
          payment.currency === "USD" &&
          typeof payment.total_amount === "number" &&
          payment.total_amount < checkout.expectedAmount
        ) {
          checkout.status = "failed";
          checkout.paymentId = payment.payment_id;
          checkout.error = `Paid ${payment.total_amount} cents but expected ${checkout.expectedAmount}`;
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

  app.get("/api/config", async (_req, res) => {
    try {
      await getStore();
      const persistence = getPersistence();
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
      res.json(plots);
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

  app.post("/api/admin/config", async (req, res) => {
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

  app.post("/api/admin/revoke", async (req, res) => {
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

  app.post("/api/checkout", async (req, res) => {
    try {
      const missing = dodoCheckoutMissing();
      if (missing) {
        return res.status(503).json({ error: missing });
      }

      const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body ?? {};
      const quote = await quotePurchaseTotal(
        plotIds,
        String(ownerId ?? ""),
        mergeConfig,
      );
      if (quote.ok === false) {
        return res.status(quote.status).json({ error: quote.error });
      }
      if (quote.totalCost < 1) {
        return res.status(400).json({ error: "Checkout amount must be at least 1 cent." });
      }

      const client = getDodoClient();
      const productId = getDodoProductId();
      if (!client || !productId) {
        return res.status(503).json({
          error: "Dodo Payments is not configured.",
        });
      }

      const checkoutId = crypto.randomUUID();
      const returnUrl = `${getAppBaseUrl(req)}/?paid=1&checkout=${encodeURIComponent(checkoutId)}`;
      const cancelUrl = `${getAppBaseUrl(req)}/?paid=0`;

      const session = await client.checkoutSessions.create({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: quote.totalCost,
          },
        ],
        billing_currency: "USD",
        return_url: returnUrl,
        cancel_url: cancelUrl,
        metadata: {
          tts_checkout_id: checkoutId,
        },
        feature_flags: {
          redirect_immediately: true,
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
        ownerId,
        brandName: String(brandName ?? ""),
        logo: String(logo ?? ""),
        websiteUrl: String(websiteUrl ?? ""),
        expectedAmount: quote.totalCost,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await saveCheckout(pending);

      res.json({
        checkoutId,
        sessionId: session.session_id,
        checkoutUrl: session.checkout_url,
        amount: quote.totalCost,
      });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to create checkout";
      res.status(502).json({
        error: `Could not start Dodo checkout. ${msg}`,
      });
    }
  });

  app.get("/api/checkout/:id", async (req, res) => {
    try {
      const ownerId = String(req.query.ownerId ?? "");
      const all = await getCheckoutMap();
      const checkout = all[req.params.id];
      if (!checkout) {
        return res.status(404).json({ error: "Checkout not found" });
      }
      if (ownerId && checkout.ownerId !== ownerId) {
        return res.status(404).json({ error: "Checkout not found" });
      }
      res.json({
        id: checkout.id,
        status: checkout.status,
        plotIds: checkout.plotIds,
        ownerId: checkout.ownerId,
        brandName: checkout.brandName,
        expectedAmount: checkout.expectedAmount,
        error: checkout.error ?? null,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to load checkout") });
    }
  });

  app.post("/api/purchase", async (req, res) => {
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
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to complete purchase") });
    }
  });

  return app;
}
