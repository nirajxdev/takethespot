import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { Plot, MarketConfig, Transaction } from "./src/types.ts";

export let MARKET_CONFIG: MarketConfig = {
  totalRows: 12,
  totalColumns: 24,
  initialPrice: 100, // 100 cents = $1.00
  maxInitialPlotsPerUser: 2,
  ownershipDurationDays: 90,
  takeoverMultiplier: 2.5
};

const CONFIG_FILE = path.join(process.cwd(), "config.json");
const DATA_FILE = path.join(process.cwd(), "plots.json");
const TRANSACTIONS_FILE = path.join(process.cwd(), "transactions.json");

async function loadMarketConfig() {
  if (await fileExists(CONFIG_FILE)) {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    Object.assign(MARKET_CONFIG, JSON.parse(data));
  }
}

async function saveMarketConfig() {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(MARKET_CONFIG, null, 2));
}

async function fileExists(filename: string) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

async function loadPlots(): Promise<Plot[]> {
  if (await fileExists(DATA_FILE)) {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } else {
    const plots: Plot[] = [];
    for (let r = 0; r < MARKET_CONFIG.totalRows; r++) {
      for (let c = 0; c < MARKET_CONFIG.totalColumns; c++) {
        plots.push({
          id: `${String.fromCharCode(65 + r)}${c + 1}`,
          row: r,
          col: c,
          status: "available",
          ownerId: null,
          brandName: null,
          logo: null,
          websiteUrl: null,
          currentPrice: MARKET_CONFIG.initialPrice,
          purchasedAt: null,
          expiresAt: null
        });
      }
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(plots, null, 2));
    return plots;
  }
}

async function loadTransactions(): Promise<Transaction[]> {
  if (await fileExists(TRANSACTIONS_FILE)) {
    const data = await fs.readFile(TRANSACTIONS_FILE, "utf-8");
    return JSON.parse(data);
  }
  return [];
}

async function savePlots(plots: Plot[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(plots, null, 2));
}

async function saveTransaction(tx: Transaction) {
  const txs = await loadTransactions();
  txs.push(tx);
  await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(txs, null, 2));
}

// Ensure plots get expired if their time is up
function refreshExpirations(plots: Plot[]) {
  const now = new Date().getTime();
  let changed = false;
  plots.forEach(plot => {
    if (plot.status === "owned" && plot.expiresAt) {
      if (new Date(plot.expiresAt).getTime() < now) {
        plot.status = "available";
        plot.ownerId = null;
        plot.brandName = null;
        plot.logo = null;
        plot.websiteUrl = null;
        changed = true;
      }
    }
  });
  return changed;
}

async function startServer() {
  await loadMarketConfig();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get("/api/config", (req, res) => {
    res.json(MARKET_CONFIG);
  });

  app.get("/api/plots", async (req, res) => {
    const plots = await loadPlots();
    if (refreshExpirations(plots)) {
      await savePlots(plots);
    }
    res.json(plots);
  });

  app.get("/api/transactions/recent", async (req, res) => {
    try {
      const txs = await loadTransactions();
      // Get the last 3 transactions, sorted by timestamp descending
      const recent = txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3);
      res.json(recent);
    } catch (e) {
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  app.get("/api/plots/:id/transactions", async (req, res) => {
    try {
      const txs = await loadTransactions();
      const plotTxs = txs
        .filter(tx => tx.plotId === req.params.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(plotTxs);
    } catch (e) {
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  // Basic admin auth middleware
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    if (token === "Bearer admin-token-xyz") {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: "admin-token-xyz" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/admin/config", adminAuth, async (req, res) => {
    try {
      const newConfig = req.body;
      Object.assign(MARKET_CONFIG, newConfig);
      await saveMarketConfig();
      res.json({ success: true, config: MARKET_CONFIG });
    } catch (e) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  app.post("/api/admin/revoke", adminAuth, async (req, res) => {
    const { plotId } = req.body;
    if (!plotId) return res.status(400).json({ error: "plotId is required" });

    const plots = await loadPlots();
    const plot = plots.find(p => p.id === plotId);
    if (!plot) return res.status(404).json({ error: "Plot not found" });

    plot.status = "available";
    plot.ownerId = null;
    plot.brandName = null;
    plot.logo = null;
    plot.websiteUrl = null;
    plot.currentPrice = MARKET_CONFIG.initialPrice;
    plot.purchasedAt = null;
    plot.expiresAt = null;

    await savePlots(plots);
    res.json({ success: true, plot });
  });

  app.post("/api/purchase", async (req, res) => {
    const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body;
    
    if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
      return res.status(400).json({ error: "No plots selected" });
    }

    // NOTE: Ensure atomic database locks for plot ownership
    // When migrating to a real database (like PostgreSQL or Firestore), implement transactional locks
    // or atomic updates here to prevent race conditions when multiple users attempt to purchase the same plot concurrently.
    const plots = await loadPlots();
    refreshExpirations(plots);

    // Validate if the user is purchasing multiple available spots, they haven't exceeded initial limit
    // Wait, the rule is "A user can purchase a maximum of 2 plots during the initial purchase."
    // Let's count how many plots they already own
    const userOwnedCount = plots.filter(p => p.ownerId === ownerId).length;
    
    // Check if these are initial purchases (price == initialPrice)
    const initialPurchasePlots = plotIds.filter(id => {
      const p = plots.find(plot => plot.id === id);
      return p && p.status === "available" && p.currentPrice === MARKET_CONFIG.initialPrice;
    });

    if (initialPurchasePlots.length > 0) {
      if (userOwnedCount + initialPurchasePlots.length > MARKET_CONFIG.maxInitialPlotsPerUser) {
        return res.status(400).json({ 
          error: `Launch limit: You can own up to ${MARKET_CONFIG.maxInitialPlotsPerUser} plots right now.` 
        });
      }
    }

    let totalCost = 0;
    const plotsToUpdate: Plot[] = [];

    // Verify all requested plots
    for (const id of plotIds) {
      const plot = plots.find(p => p.id === id);
      if (!plot) {
        return res.status(400).json({ error: `Plot ${id} not found.` });
      }
      if (plot.ownerId === ownerId) {
        return res.status(400).json({ error: `You already own plot ${id}.` });
      }
      
      let cost = 0;
      let newPrice = plot.currentPrice;

      if (plot.status === "available") {
        cost = plot.currentPrice;
      } else if (plot.status === "owned") {
        cost = Math.round(plot.currentPrice * MARKET_CONFIG.takeoverMultiplier);
        newPrice = cost;
      }
      
      totalCost += cost;
      plotsToUpdate.push(plot);
    }

    // Process transactions and update plots
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MARKET_CONFIG.ownershipDurationDays * 24 * 60 * 60 * 1000);

    for (const plot of plotsToUpdate) {
      let transactionAmount = 0;
      let newPrice = plot.currentPrice;

      if (plot.status === "available") {
        transactionAmount = plot.currentPrice;
      } else {
        transactionAmount = Math.round(plot.currentPrice * MARKET_CONFIG.takeoverMultiplier);
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
        platformFee: Math.round(transactionAmount * 0.1), // Example 10% fee
        timestamp: now.toISOString()
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
