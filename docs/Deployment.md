# Deployment Guide

Panduan lengkap untuk deploy aplikasi Seblak Prasmanan ke production.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Deploy Database (Supabase)](#deploy-database-supabase)
5. [Deploy Application (Vercel)](#deploy-application-vercel)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

**Tech Stack untuk Production:**
- **Frontend + Backend:** Vercel (Next.js hosting)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Clerk (planned)
- **Payment Gateway:** Midtrans
- **Realtime:** Supabase Realtime via WebSocket

**Architecture:**

```
┌──────────────────────────────────────────────────┐
│             Vercel (Edge Network)                │
│  - Next.js App (SSR + API Routes)               │
│  - tRPC Endpoints                                │
│  - Automatic HTTPS                               │
│  - CDN for static assets                         │
└────────────────┬─────────────────────────────────┘
                 │
                 ├─────────────────────┐
                 │                     │
     ┌───────────▼──────────┐  ┌──────▼──────────┐
     │   Supabase Cloud     │  │  Midtrans API   │
     │  - PostgreSQL DB     │  │  - Payment      │
     │  - Realtime Engine   │  │  - Webhook      │
     └──────────────────────┘  └─────────────────┘
```

---

## Prerequisites

Sebelum deploy, pastikan kamu sudah punya:

- ✅ GitHub repository (untuk Vercel auto-deploy)
- ✅ Akun Supabase (free tier cukup untuk start)
- ✅ Akun Vercel (free tier cukup untuk start)
- ✅ Akun Midtrans (production credentials)
- ✅ Akun Clerk (jika menggunakan auth - planned)

---

## Environment Variables

### Development (.env.local)

```bash
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Midtrans (Sandbox)
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
MIDTRANS_IS_PRODUCTION="false"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Clerk (optional, planned)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### Production

Sama seperti development, tapi dengan credentials production:
- Midtrans production keys
- `MIDTRANS_IS_PRODUCTION="true"`
- `NEXT_PUBLIC_APP_URL="https://yourdomain.com"`
- Clerk production keys (jika sudah implement auth)

---

## Deploy Database (Supabase)

### 1. Create Supabase Project

1. Buka [supabase.com](https://supabase.com)
2. Klik "New Project"
3. Pilih organization
4. Isi:
   - **Name:** seblak-prasmanan-prod
   - **Database Password:** Generate strong password (SIMPAN INI!)
   - **Region:** Singapore (terdekat dengan Indonesia)
   - **Pricing Plan:** Free (upgrade later jika perlu)
5. Klik "Create new project"
6. Tunggu ~2 menit sampai database ready

---

### 2. Get Connection Strings

1. Pergi ke **Settings → Database**
2. Scroll ke "Connection string"
3. Copy dua connection strings:

**Connection pooling (untuk DATABASE_URL):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

**Direct connection (untuk DIRECT_URL):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Replace `[PASSWORD]` dengan password yang kamu simpan tadi.

---

### 3. Run Migrations

Dari local machine:

```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy

# Verify
npx prisma db seed
```

Cek di Supabase dashboard → **Table Editor**, kamu harusnya melihat:
- ✅ `bowls` (5 rows)
- ✅ `orders` (0 rows)
- ✅ `payments` (0 rows)

---

### 4. Enable Realtime

1. Pergi ke **Database → Replication**
2. Find tabel `orders` dan `payments`
3. Toggle **ON** untuk kedua tabel
4. Klik "Save"

**Note:** Realtime hanya work untuk tabel yang explicitly enabled. Jangan lupa step ini!

---

## Deploy Application (Vercel)

### 1. Push Code ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/seblak-app.git
git push -u origin main
```

---

### 2. Connect Vercel to GitHub

1. Buka [vercel.com](https://vercel.com)
2. Klik "Add New Project"
3. Import dari GitHub → pilih repository `seblak-app`
4. Vercel auto-detect Next.js, jangan ubah framework preset

---

### 3. Configure Environment Variables

Di Vercel dashboard, pergi ke **Settings → Environment Variables**

Add semua variables dari production `.env`:

| Variable | Value | Environment |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Production |
| `DIRECT_URL` | `postgresql://...` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://...supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production |
| `MIDTRANS_SERVER_KEY` | Production key | Production |
| `MIDTRANS_CLIENT_KEY` | Production key | Production |
| `MIDTRANS_IS_PRODUCTION` | `true` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.vercel.app` | Production |

**PENTING:** Jangan commit `.env` ke Git! Vercel environment variables sudah cukup.

---

### 4. Deploy

1. Klik "Deploy"
2. Tunggu ~2 menit untuk build selesai
3. Vercel akan kasih URL deployment: `https://seblak-app.vercel.app`

---

### 5. Verify Deployment

Test semua halaman:

**✅ Pelanggan:**
```
https://yourdomain.vercel.app/order/bowl-A1
```
- Form harus muncul
- Submit form harus redirect ke tracking page
- Tracking page harus update realtime saat kasir input harga

**✅ Kasir:**
```
https://yourdomain.vercel.app/kasir
```
- Dashboard kasir muncul (tanpa auth dulu)
- Order baru dari pelanggan muncul realtime
- Input harga harus work

**✅ Dapur (setelah Phase 4):**
```
https://yourdomain.vercel.app/dapur
```
- Dashboard dapur muncul
- Antrian pesanan update realtime

---

## Post-Deployment Setup

### 1. Custom Domain (Optional)

Jika kamu punya domain sendiri (e.g., `seblak-prasmanan.com`):

1. Pergi ke Vercel project → **Settings → Domains**
2. Add domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` di environment variables

---

### 2. Setup Midtrans Webhook

Midtrans perlu tahu kemana kirim notification setelah payment.

1. Login ke [Midtrans Dashboard](https://dashboard.midtrans.com)
2. Pergi ke **Settings → Configuration**
3. Set **Payment Notification URL**:
   ```
   https://yourdomain.vercel.app/api/payments/webhook
   ```
4. Set **Finish Redirect URL**:
   ```
   https://yourdomain.vercel.app/order/track/[order_id]
   ```
5. Save

**Note:** `[order_id]` akan otomatis replaced by Midtrans dengan actual order ID.

---

### 3. Generate QR Codes untuk Wadah

Setelah deploy, generate QR codes untuk wadah fisik:

```bash
npm run generate-qr
```

Script ini akan:
1. Generate QR code untuk setiap bowl ID (`bowl-A1` s/d `bowl-A5`)
2. Save sebagai PNG di `public/qr-codes/`
3. Print QR codes → tempel di wadah fisik

**QR Code content:**
```
https://yourdomain.vercel.app/order/bowl-A1
```

---

### 4. Setup Clerk Auth (Planned)

Ketika ready implement auth:

1. Buka [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create new application: "Seblak Prasmanan Prod"
3. Get production keys
4. Add ke Vercel environment variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
   CLERK_SECRET_KEY="sk_live_..."
   ```
5. Create users untuk kasir dan dapur
6. Assign roles via metadata:
   ```json
   { "role": "kasir" }
   { "role": "dapur" }
   ```
7. Redeploy dari Vercel dashboard

---

## Monitoring & Maintenance

### 1. Vercel Analytics

Aktifkan analytics untuk monitoring:
1. Pergi ke Vercel project → **Analytics**
2. Enable (free tier: 2,500 page views/month)
3. Monitor metrics:
   - Page views
   - Real users
   - Performance (Web Vitals)

---

### 2. Database Monitoring

Monitor via Supabase dashboard:
1. **Database → Usage** — cek storage, connections
2. **Database → Replication** — pastikan realtime active
3. **Logs → Postgres Logs** — untuk debugging query issues

**Alerts to set:**
- Storage > 400MB (free tier limit: 500MB)
- Concurrent connections > 40 (free tier limit: 60)

---

### 3. Error Tracking

Setup Sentry untuk production error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Sentry will catch:
- Frontend errors (React crashes)
- Backend errors (tRPC procedure failures)
- Performance issues

---

### 4. Backup Strategy

**Supabase auto-backup (free tier):**
- Daily backup, retained for 7 days
- Upgrade to Pro ($25/mo) untuk point-in-time recovery

**Manual backup:**
```bash
# Backup database ke local
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore dari backup
psql $DATABASE_URL < backup-20241231.sql
```

Run backup script weekly via cron job atau GitHub Actions.

---

### 5. Performance Optimization

**Database indexes** — sudah ada, verify:
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('orders', 'bowls', 'payments');
```

**Next.js caching** — verify di Vercel dashboard:
- Static pages should be cached at edge
- tRPC routes should have reasonable response times (<500ms)

**Supabase connection pooling** — already enabled via `?pgbouncer=true` in DATABASE_URL

---

## Rollback Strategy

Jika ada issue di production:

### Quick Rollback (Vercel)

1. Pergi ke Vercel project → **Deployments**
2. Find last stable deployment
3. Klik "..." → **Promote to Production**
4. Instant rollback tanpa rebuild

---

### Database Rollback (Prisma)

Jika migration error:

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back [migration_name]

# Re-apply correct migration
npx prisma migrate deploy
```

---

## Cost Estimation

**Free Tier (prototype / low traffic):**
- Vercel: Free (100GB bandwidth/month)
- Supabase: Free (500MB storage, 2GB transfer)
- Clerk: Free (10,000 MAU)
- Midtrans: No monthly fee, 0.7% per transaction

**Total:** Rp 0/bulan + transaction fees

---

**Small Scale (30-50 orders/day):**
- Vercel: Free tier cukup
- Supabase: Free tier cukup
- Clerk: Free tier cukup
- Midtrans: ~Rp 5,000-10,000/hari (0.7% dari Rp 500,000-1,000,000 GMV)

**Total:** Rp 0/bulan + ~Rp 150,000-300,000/bulan transaction fees

---

**Growing Scale (100-200 orders/day):**
- Vercel Pro: $20/month (~Rp 320,000)
- Supabase Pro: $25/month (~Rp 400,000)
- Clerk Pro: $25/month (~Rp 400,000)
- Midtrans: ~Rp 20,000-40,000/hari transaction fees

**Total:** ~Rp 1,700,000/bulan

---

## Troubleshooting

### Issue: "ECONNREFUSED" saat connect ke database

**Solution:** Check DATABASE_URL format. Pastikan:
1. Port 6543 untuk connection pooling
2. Password di-encode jika ada special characters
3. `?pgbouncer=true` ada di akhir URL

---

### Issue: Realtime tidak update

**Solution:**
1. Verify replication enabled: Supabase → Database → Replication
2. Check browser console untuk WebSocket errors
3. Verify Supabase anon key di environment variables

---

### Issue: Midtrans webhook tidak masuk

**Solution:**
1. Verify webhook URL di Midtrans dashboard
2. Check Vercel logs: **Deployments → [latest] → Functions**
3. Test webhook locally via ngrok:
   ```bash
   ngrok http 3000
   # Set Midtrans webhook ke ngrok URL
   ```

---

### Issue: Build failed di Vercel

**Solution:**
1. Check Vercel build logs untuk error message
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Prisma client not generated
3. Run `npm run build` locally untuk reproduce

---

## Security Checklist

Before going live:

- [ ] All environment variables set di Vercel (tidak di code)
- [ ] `.env` dan `.env.local` di `.gitignore`
- [ ] Supabase RLS policies configured (row-level security)
- [ ] Clerk auth implemented untuk kasir dan dapur routes
- [ ] Midtrans webhook signature verification implemented
- [ ] HTTPS enforced (Vercel auto-enable)
- [ ] Rate limiting di tRPC procedures (prevent abuse)
- [ ] CSP headers configured di `next.config.ts`

---

**Next:** [Development Guide](./Development.md)
