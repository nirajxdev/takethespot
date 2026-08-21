# TakeTheSpot

A competitive digital billboard where startups claim visible territory on a shared board. Pay to claim your spot — pay more to take someone else's.

## Phase 1 — Project Foundation

This phase includes:

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM with full schema
- Clerk authentication (sign up / sign in)
- Landing page, navigation, dashboard, and product creation flow

Not yet implemented: board canvas, territory claiming, payments (Razorpay).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers + Server Actions |
| Database | PostgreSQL + Prisma |
| Auth | Clerk |
| Payments | Razorpay (Phase 5) |

## Prerequisites

- Node.js 20+
- [Neon](https://neon.tech) PostgreSQL database (recommended) or any hosted/local Postgres
- [Clerk](https://clerk.com) account

> **Note:** This project uses Prisma 7 with the `@prisma/adapter-pg` driver adapter. Your `DATABASE_URL` must be a standard `postgresql://` connection string. Do **not** use the `prisma+postgres://` dev URL unless you run `npx prisma dev` locally.

**Full step-by-step guide:** see [SETUP.md](./SETUP.md).

## Setup (summary)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   **Neon database:** Create a project at [neon.tech](https://neon.tech), copy the `postgresql://` connection string, and set `DATABASE_URL` in `.env`.

   **Clerk auth (required):** Create an app at [dashboard.clerk.com](https://dashboard.clerk.com), then add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env`. The app will not start without these.

3. **Push database schema**

   ```bash
   npx prisma db push
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/           # Routes (landing, board, claim, dashboard, product, admin, api)
├── components/    # UI and feature components
├── lib/           # Prisma, auth, pricing, validation, stubs
├── actions/       # Server actions (products, territories)
├── hooks/         # Custom hooks (future)
└── types/         # Shared TypeScript types
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/board` | Board placeholder (Phase 2) |
| `/claim` | Claim flow placeholder (Phase 2) |
| `/dashboard` | User's products |
| `/dashboard/products/new` | Create a product |
| `/product/[slug]` | Product detail |
| `/sign-in`, `/sign-up` | Clerk auth pages |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

See `.env.example` for the full list. Required for Phase 1:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key

## License

Private — all rights reserved.
