# Warung Seblak App — Sistem Pemesanan Digital

> Digitalisasi sistem pemesanan warung seblak prasmanan tanpa mengurangi pengalaman unik prasmanan itu sendiri.

---

## 📋 Daftar Isi

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Quick Start](#quick-start)
- [Dokumentasi Lengkap](#dokumentasi-lengkap)
- [Status Pengembangan](#status-pengembangan)

---

## Overview

Warung seblak ini memiliki konsep unik: **sistem prasmanan** di mana pelanggan memilih sendiri bahan-bahan seblak (tahu, kwetiaw, kerupuk, dll.) ke dalam wadah, kemudian menyerahkannya ke kasir untuk diproses.

Sistem ini mendigitalisasi **hanya bagian sebelum dan sesudah momen prasmanan**, bukan menggantikannya. Pelanggan tetap merasakan pengalaman memilih sendiri secara fisik, tapi mendapat benefit digitalisasi untuk:

- ✅ Form preferensi rasa yang tidak hilang atau tertukar
- ✅ Tracking pesanan realtime
- ✅ Notifikasi harga otomatis
- ✅ Bukti pembayaran digital untuk kasir
- ✅ Antrian pesanan terorganisir untuk dapur

---

## Fitur Utama

### 👤 Untuk Pelanggan

- Scan QR code di wadah prasmanan via HP (tidak perlu install app)
- Input nama + preferensi rasa (level pedas, kuah/nyemek/kering, asin/manis/normal)
- Ambil bahan seblak seperti biasa (prasmanan tetap berjalan)
- Terima notifikasi total harga secara realtime
- Pilih bayar online (QRIS) atau cash ke kasir

### 💰 Untuk Kasir

- Dashboard realtime semua pesanan aktif
- Scan QR wadah untuk lihat data pelanggan
- Input total harga → notifikasi otomatis ke pelanggan
- Konfirmasi pembayaran (cash atau verifikasi online)
- Tracking status pembayaran per pesanan

### 🍳 Untuk Dapur

- Antrian pesanan realtime (FIFO)
- Lihat nama + preferensi rasa per pesanan
- Update status: Mulai Masak → Siap Diantar
- Tidak perlu scan QR — wadah diterima fisik dari kasir

---

## Tech Stack

### Frontend & Backend

- **Next.js 16** (App Router) — Full-stack framework
- **TypeScript** — Type safety
- **tRPC** — Type-safe API layer
- **Tailwind CSS** + **Shadcn/ui** — Styling & components

### Database & Realtime

- **Supabase** (PostgreSQL) — Database hosting
- **Prisma ORM** — Type-safe database queries
- **Supabase Realtime** — Realtime updates via WebSocket

### Validasi & Payment

- **Zod** — Schema validation
- **Midtrans** — Payment gateway (QRIS, e-wallet)

### Auth (Planned)

- **Clerk** — Authentication & role-based access control
  - Role: `kasir` untuk dashboard kasir
  - Role: `dapur` untuk dashboard dapur
  - Pelanggan: akses publik tanpa auth

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                         PELANGGAN                           │
│  Scan QR → Form Preferensi → Prasmanan → Tracking Pesanan   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   tRPC Router  │
              │  (Type-safe)   │
              └────┬───────┬───┘
                   │       │
        ┏━━━━━━━━━━┻━┓   ┏━┻━━━━━━━━━━━┓
        ┃   KASIR    ┃   ┃    DAPUR    ┃
        ┃  Protected ┃   ┃  Protected  ┃
        ┗━━━━━━━━━━━━┛   ┗━━━━━━━━━━━━━┛
                   │       │
                   ▼       ▼
           ┌───────────────────────┐
           │   Supabase Realtime   │
           │    (PostgreSQL)       │
           └───────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (via Supabase)
- Midtrans account (untuk payment gateway)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd seblak-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase dan Midtrans

# Setup database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

Buka browser:

- Pelanggan: `http://localhost:3000/order/bowl-A1`
- Kasir: `http://localhost:3000/kasir`
- Dapur: `http://localhost:3000/dapur`

---

## Dokumentasi Lengkap

Dokumentasi detail tersedia di folder `/docs`:

- **[Architecture.md](docs/Architecture.md)** — Arsitektur sistem, flow data, dan design decisions
- **[Database.md](docs/Database.md)** — Database schema, relasi, dan indexes
- **[API.md](docs/API.md)** — tRPC router documentation dan contoh usage
- **[Deployment.md](docs/Deployment.md)** — Panduan deploy ke production (Vercel + Supabase)
- **[Development.md](docs/Development.md)** — Setup local development dan best practices

---

## Status Pengembangan

### ✅ Completed (v0.1 — Prototype)

- [x] Setup project (Next.js + TypeScript + Prisma)
- [x] Database schema dengan enums
- [x] tRPC setup dengan type-safe procedures
- [x] Halaman pelanggan (form + tracking realtime)
- [x] Dashboard kasir (scan QR, input harga, konfirmasi pembayaran)
- [x] Supabase Realtime untuk live updates

### 🚧 In Progress

- [ ] Dashboard dapur (antrian pesanan realtime)
- [ ] Midtrans payment integration (QRIS)

### 📋 Planned (v0.2)

- [ ] Authentication dengan Clerk (role-based: kasir, dapur)
- [ ] Generate QR codes untuk wadah
- [ ] Webhook Midtrans untuk auto-confirm payment

### 🔮 Future Enhancements

- [ ] Print struk (thermal printer ESC/POS)
- [ ] Admin dashboard (rekap pendapatan, analytics)
- [ ] Manajemen menu & harga per item
- [ ] Notifikasi WhatsApp (backup jika tab tertutup)
- [ ] Multi-tenant (platform untuk banyak warung)

---

## Contributing

Saat ini project masih dalam tahap prototype untuk satu warung spesifik. Kontribusi akan dibuka setelah v1.0 stable.

---

## License

Proprietary — All rights reserved.

---

## Contact

Untuk pertanyaan atau feedback, hubungi pemilik warung seblak melalui [kontak yang akan ditambahkan].

---

**Built with ❤️ for Seblak Prasmanan**
