# TakeTheSpot 
> **Own your spot. Build your presence. Defend your territory.**

**TakeTheSpot** is a competitive digital advertising marketplace where startups, products, creators, and businesses can claim territory on a shared 10×10 digital billboard.

Every spot is a piece of digital real estate.

Users can claim available spots, showcase their brand, and compete for valuable territory. Once a spot is owned, another user can acquire it by paying more — turning the billboard into a living, competitive marketplace.

---

## Core Features

### Interactive Billboard

The platform contains **100 individual digital plots** arranged in a 10×10 grid.

Each plot has its own:

- Unique ID
- Owner
- Brand
- Current value
- Ownership period
- Status

Users interact directly with the billboard instead of navigating through a traditional advertising marketplace.


### Claim Your Territory

Users can select available plots and claim them for their brand.

At launch:

- Starting price: **$1**
- Maximum initial plots per user: **2**
- Ownership duration: **3 months**

After purchasing a plot, the user's brand appears directly on the billboard.


### Showcase Your Brand

Each owned plot displays:

- Brand logo
- Brand name

Clicking a brand's territory allows visitors to discover the associated website.

The goal is simple:

> **Get your brand noticed.**


### Competitive Territory

TakeTheSpot is not just a static advertising board.

Owned territories can be acquired by other users.

The acquisition price is calculated using a configurable multiplier.


---

## Payments (Dodo)

Checkout creates a **pending session on the server**. Plots are transferred only after Dodo sends a signed `payment.succeeded` webhook — not when the browser returns from checkout.

**Webhook URL (production):** `https://takethespot.lol/api/webhooks/dodo`  
Paste that in the Dodo dashboard under **Developer → Webhooks**. Events: `payment.succeeded`, plus `payment.failed` / `payment.cancelled`.

Env vars (also listed in `.env.example`): `DODO_PAYMENTS_API_KEY` (or `DODO_API_KEY`), `DODO_PAYMENTS_WEBHOOK_KEY` (or `DODO_WEBHOOK_SECRET`), `DODO_PAYMENTS_ENVIRONMENT=test_mode`, `DODO_PRODUCT_ID` (one-time **Pay What You Want** product so plot totals in cents can be charged dynamically), optional `APP_URL=https://takethespot.lol`.

Local `npm run dev` still starts if keys are missing; **Pay** returns a clear 503 instead of crashing the API. For webhooks on localhost, tunnel the same `/api/webhooks/dodo` path or use Dodo’s dashboard “Send example” against production.

---

## License

Private — all rights reserved.
