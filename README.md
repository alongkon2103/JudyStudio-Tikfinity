# JudyShop Tikfinity

ระบบขายสิทธิ์ Tikfinity Pro ผ่าน Stripe + auto-fulfillment ผ่าน Tikfinity Reseller API

แยกขาดจาก JudyShop หลัก (DB แยก, deploy แยก) เชื่อมกันแค่ผ่านลิงก์จากหน้าเว็บ JudyShop เท่านั้น

## Setup

### 1. ติดตั้ง dependencies

```bash
cd JudyShopTikfinity
npm install
```

### 2. ตั้งค่า Supabase

1. สร้าง project ใหม่ที่ https://supabase.com
2. ไปที่ **Settings → Database** copy:
   - **Connection string (Transaction mode)** → `DATABASE_URL`
   - **Connection string (Session mode)** → `DIRECT_URL`

### 3. ตั้งค่า env

```bash
cp .env.example .env.local
```

แก้ค่าในไฟล์ `.env.local`:

- `DATABASE_URL` / `DIRECT_URL` — จาก Supabase
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — จาก Stripe dashboard
- `TIKFINITY_RESELLER_KEY` — key ที่ tikfinityth.one ออกให้
- `ADMIN_SESSION_SECRET` — สุ่มยาว 32+ ตัว เช่น `openssl rand -base64 64`

### 4. Migrate database

```bash
npm run db:push      # ครั้งแรก: push schema เข้า Supabase
npm run db:seed      # seed product + variant default
npm run admin:create # สร้าง admin user คนแรก
```

### 5. รัน dev

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
