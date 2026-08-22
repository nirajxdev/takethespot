import express from "express";
import {
  createEmptyPlots,
  mergeConfig,
  refreshExpirations,
} from "./market.ts";
import { getPersistence, getStore } from "./store.ts";
import type { Plot, Transaction } from "../src/types.ts";

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

async function saveTransaction(tx: Transaction) {
  const store = await getStore();
  const txs = await store.getTransactions();
  txs.push(tx);
  await store.setTransactions(txs);
}

export function createApiApp() {
  const expressLib = getExpress();
  const app = expressLib();
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

  app.post("/api/purchase", async (req, res) => {
    try {
      const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body;

      if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
        return res.status(400).json({ error: "No plots selected" });
      }

      const config = await loadConfig();
      const plots = await loadPlots();
      refreshExpirations(plots);

      const userOwnedCount = plots.filter((p) => p.ownerId === ownerId).length;

      const initialPurchasePlots = plotIds.filter((id: string) => {
        const p = plots.find((plot) => plot.id === id);
        return (
          p &&
          p.status === "available" &&
          p.currentPrice === config.initialPrice
        );
      });

      if (initialPurchasePlots.length > 0) {
        if (
          userOwnedCount + initialPurchasePlots.length >
          config.maxInitialPlotsPerUser
        ) {
          return res.status(400).json({
            error: `Launch limit: You can own up to ${config.maxInitialPlotsPerUser} plots right now.`,
          });
        }
      }

      let totalCost = 0;
      const plotsToUpdate: Plot[] = [];

      for (const id of plotIds) {
        const plot = plots.find((p) => p.id === id);
        if (!plot) {
          return res.status(400).json({ error: `Plot ${id} not found.` });
        }
        if (plot.ownerId === ownerId) {
          return res
            .status(400)
            .json({ error: `You already own plot ${id}.` });
        }

        let cost = 0;
        if (plot.status === "available") {
          cost = plot.currentPrice;
        } else if (plot.status === "owned") {
          cost = Math.round(plot.currentPrice * config.takeoverMultiplier);
        }

        totalCost += cost;
        plotsToUpdate.push(plot);
      }

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + config.ownershipDurationDays * 24 * 60 * 60 * 1000,
      );

      for (const plot of plotsToUpdate) {
        let transactionAmount = 0;
        let newPrice = plot.currentPrice;

        if (plot.status === "available") {
          transactionAmount = plot.currentPrice;
        } else {
          transactionAmount = Math.round(
            plot.currentPrice * config.takeoverMultiplier,
          );
          newPrice = transactionAmount;
        }

        const tx: Transaction = {
          id: crypto.randomUUID(),
          plotId: plot.id,
          previousOwner: plot.ownerId,
          newOwner: ownerId,
          previousPrice: plot.currentPrice,
          newPrice,
          transactionAmount,
          platformFee: Math.round(transactionAmount * 0.1),
          timestamp: now.toISOString(),
        };

        await saveTransaction(tx);

        plot.status = "owned";
        plot.ownerId = ownerId;
        plot.brandName = brandName;
        plot.logo = logo;
        plot.websiteUrl = websiteUrl;
        plot.currentPrice = newPrice;
        plot.purchasedAt = now.toISOString();
        plot.expiresAt = expiresAt.toISOString();
      }

      await savePlots(plots);

      res.json({ success: true, updatedPlots: plotsToUpdate, totalCost });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: publicError(e, "Failed to complete purchase") });
    }
  });

  return app;
}
