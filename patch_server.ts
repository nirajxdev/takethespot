import fs from 'fs';
const code = fs.readFileSync('server.ts', 'utf-8');

const dodoEndpoint = `
  app.post("/api/create-dodo-checkout", async (req, res) => {
    const { plotIds, amount } = req.body;
    if (!process.env.DODO_PAYMENTS_API_KEY || !process.env.DODO_PRODUCT_ID) {
      return res.status(500).json({ error: "Dodo Payments API Key or Product ID not configured in environment variables." });
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
`;

const updatedCode = code.replace('app.post("/api/purchase"', dodoEndpoint + '\n  app.post("/api/purchase"');
fs.writeFileSync('server.ts', updatedCode);
