# TakeTheSpot — Local Setup Guide

Follow this checklist to get the app running locally.

## Quick checklist

```
□ Create Neon project at https://neon.tech
□ Copy connection string to DATABASE_URL in .env
□ Create Clerk app at https://clerk.com
□ Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to .env
□ Run: npx prisma db push
□ Run: npm run dev
□ Open http://localhost:3000
```

---

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Neon PostgreSQL

1. Go to [https://neon.tech](https://neon.tech) and create a free account.
2. Create a new project (any region is fine).
3. On the project dashboard, click **Connect**.
4. Copy the **connection string** — use the `postgresql://` format.
5. Open `.env` in the project root and set:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```

   Replace with your actual Neon string. Do **not** use `prisma+postgres://` for Neon.

6. Push the database schema:

   ```bash
   npx prisma db push
   ```

   You should see tables created in your Neon project (check the **Tables** tab in the Neon console).

## 3. Set up Clerk authentication

**The app will return HTTP 500 until Clerk keys are configured.**

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and create an application.
2. Open **Configure → API Keys**.
3. Copy these two values into `.env`:

   | Variable | Where to find it | Example prefix |
   |----------|------------------|----------------|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key | `pk_test_...` |
   | `CLERK_SECRET_KEY` | Secret key | `sk_test_...` |

4. Optional Clerk URL settings (already match the app defaults):

   ```env
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   ```

**Shortcut:** If you prefer the CLI, run `npx clerk@latest init` (creates a Clerk app and writes keys to `.env`) or `npx clerk@latest env pull` (pulls keys from an existing app).

## 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Troubleshooting

### HTTP 500 on every page

**Cause:** Missing Clerk keys in `.env`.

**Fix:** Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, then restart the dev server (`Ctrl+C`, then `npm run dev`).

Error in the terminal looks like:

```
@clerk/nextjs: Missing publishableKey
```

### Database connection errors

**Cause:** `DATABASE_URL` is missing, invalid, or still set to the `prisma+postgres://` local dev URL.

**Fix:** Use a real `postgresql://` connection string from Neon (see step 2 above), then run `npx prisma db push`.

### `npx prisma dev` vs Neon

This project is configured for a hosted Neon database. You do **not** need `npx prisma dev` if you use Neon.

- `prisma+postgres://` URLs are for the local Prisma dev server only.
- Neon uses standard `postgresql://` URLs.

### Prisma schema not applied

Run:

```bash
npx prisma db push
```

Or with migration history:

```bash
npx prisma migrate dev --name init
```

### Dev server not picking up `.env` changes

Stop the server (`Ctrl+C`) and restart:

```bash
npm run dev
```

Next.js only reads `.env` at startup.

---

## Production deployment (Clerk + domain)

The app sets Clerk `authorizedParties` from `NEXT_PUBLIC_APP_URL` in middleware. You still need to finish Clerk and hosting setup in dashboards you control.

### A. Clerk production instance

1. [Clerk Dashboard](https://dashboard.clerk.com) → instance dropdown → **Create production instance**
2. **Domains** → add your domain → copy DNS records into your registrar
3. Wait for DNS to propagate (can take up to 48 hours)
4. Click **Deploy certificates** when the dashboard shows all steps complete
5. Reconfigure anything that did not copy from dev: SSO/OAuth providers, integrations, paths

**CLI shortcut (after `npx clerk@latest link`):**

```bash
npx clerk@latest deploy
npx clerk@latest env pull --instance prod
```

### B. Environment variables (production)

Set these on your host (Vercel, etc.) — not only in local `.env`:

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` (no trailing slash) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `DATABASE_URL` | Your Neon production connection string |

Then redeploy the app.

### C. Deploy the Next.js app (Vercel example)

```bash
npm i -g vercel
vercel login
vercel --prod
```

In the Vercel project settings, add your custom domain and paste the production env vars above.

### D. Database migrations (production)

```bash
npx prisma migrate deploy
```

Run this against your production `DATABASE_URL` before or right after the first production deploy.

### E. OAuth (if you use social sign-in)

Development uses Clerk shared OAuth credentials. Production requires your own credentials per provider in the Clerk Dashboard.

---

## Verify everything works

1. Homepage loads at `http://localhost:3000` (no 500 error).
2. **Sign Up** / **Sign In** links open Clerk auth pages.
3. After signing in, `/dashboard` is accessible.
4. Creating a product at `/dashboard/products/new` saves to the Neon database.
