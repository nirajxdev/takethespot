import fs from 'fs';

const head = fs.readFileSync('clean_server.ts', 'utf-8').split('\n').slice(0, 198).join('\n');

const endpoints = `
  app.post("/api/create-dodo-checkout", async (req, res) => {
    const { plotIds, amount } = req.body;
    if (!process.env.DODO_PAYMENTS_API_KEY || !process.env.DODO_PRODUCT_ID) {
      return res.status(500).json({ error: "Dodo Payments API Key or Product ID not configured in environment variables." });
    }
    
    if (plotIds.length > 12) {
      return res.status(400).json({ error: "You can only purchase up to 12 plots per transaction." });
    }

    try {
      const DodoPayments = (await import("dodopayments")).default;
      const client = new DodoPayments({
        bearerToken: process.env.DODO_PAYMENTS_API_KEY,
        environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
      });
      const session = await client.checkoutSessions.create({
        billing: {
          city: "", country: "US", email: "", name: "", state: "", street: "", zipcode: ""
        },
        product_cart: [{
          product_id: process.env.DODO_PRODUCT_ID,
          quantity: plotIds.length
        }],
        return_url: \`\${req.protocol}://\${req.get("host")}/?payment_success=true\`
      });
      res.json({ checkoutUrl: session.checkout_url });
    } catch (error: any) {
      console.error("DodoPayments error:", error);
      res.status(500).json({ error: error.message || "Failed to create Dodo Payments checkout session" });
    }
  });

  app.post("/api/purchase", async (req, res) => {
    const { plotIds, ownerId, brandName, logo, websiteUrl } = req.body;
    
    if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
      return res.status(400).json({ error: "No plots selected" });
    }
    
    if (plotIds.length > 12) {
      return res.status(400).json({ error: "You can only own up to 12 plots." });
    }

    const plots = await loadPlots();
    refreshExpirations(plots);

    let totalCost = 0;
    const plotsToUpdate: any[] = [];

    // Verify all requested plots
    for (const id of plotIds) {
      const plot = plots.find(p => p.id === id);
      if (!plot) return res.status(404).json({ error: \`Plot \${id} not found\` });

      if (plot.status === "owned") {
        if (plot.ownerId === ownerId) {
          return res.status(400).json({ error: \`You already own plot \${id}\` });
        }
      }
      
      const cost = plot.status === "available" 
        ? plot.currentPrice 
        : Math.round(plot.currentPrice * MARKET_CONFIG.takeoverMultiplier);
        
      totalCost += cost;
      plotsToUpdate.push(plot);
    }

    // Process transactions and update plots
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MARKET_CONFIG.ownershipDurationDays * 24 * 60 * 60 * 1000);
    const crypto = require("crypto");

    for (const plot of plotsToUpdate) {
      let transactionAmount = 0;
      let newPrice = plot.currentPrice;

      if (plot.status === "available") {
        transactionAmount = plot.currentPrice;
      } else {
        transactionAmount = Math.round(plot.currentPrice * MARKET_CONFIG.takeoverMultiplier);
        newPrice = transactionAmount;
      }

      const tx: any = {
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
`;

const tail = `
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
    console.log(\`Server running on port \${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', head + '\\n' + endpoints + '\\n' + tail);
console.log("Rewrote server.ts");
