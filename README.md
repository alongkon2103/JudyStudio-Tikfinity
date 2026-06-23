# JudyShop Tikfinity

Storefront for selling Tikfinity Pro extensions via Stripe Checkout, with auto-fulfillment through the Tikfinity Reseller API.

Runs separately from the main JudyShop site (own DB, own deploy). The two are linked only via outbound links from the JudyShop storefront.

## Setup

### 1. Install dependencies

```bash
cd JudyShopTikfinity
npm install
```

### 2. Configure Supabase

1. Create a new project at https://supabase.com
2. Open **Settings → Database** and copy:
   - **Connection string (Transaction mode)** → `DATABASE_URL`
   - **Connection string (Session mode)** → `DIRECT_URL`

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `DATABASE_URL` / `DIRECT_URL` — from Supabase
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from the Stripe dashboard
- `TIKFINITY_RESELLER_KEY` — issued by tikfinityth.one
- `ADMIN_SESSION_SECRET` — a 32+ character random string, e.g. `openssl rand -base64 64`

### 4. Migrate the database

```bash
npm run db:push      # first time: push schema to Supabase
npm run db:seed      # seed default product + variants
npm run admin:create # create the first admin user
```

### 5. Run dev

```bash
npm run dev
# → http://localhost:3001
```

## Project structure

```
src/
  app/
    page.tsx            ← single-page user flow (email → duration → pay)
    success/            ← Stripe success redirect
    cancel/             ← Stripe cancel redirect
    admin/              ← admin panel (login + dashboard + orders + pricing)
    api/
      tikfinity/        ← check email, get history
      checkout/         ← create Stripe session
      stripe-webhook/   ← fulfillment trigger
  lib/
    db.ts               ← Prisma client singleton
    env.ts              ← typed env vars
    auth.ts             ← admin JWT cookie helpers
    admin-session.ts    ← getAdminSession / requireAdmin
    stripe.ts           ← Stripe SDK client
    tikfinity.ts        ← Tikfinity reseller API wrapper
prisma/
  schema.prisma         ← Product, Variant, Order, AdminUser
  seed.ts               ← seed Tikfinity Pro + 4 default variants
```

## Tikfinity Reseller API endpoints

- `GET  /findUserByEmail?email=...`  — verify Tikfinity user exists + get channelId + current expiry
- `GET  /history?key=...`            — reseller credits, rate, history
- `POST /setProExpire`               — extend pro expiry (debit credits)
