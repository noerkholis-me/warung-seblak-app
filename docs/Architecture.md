# Arsitektur Sistem

Dokumentasi lengkap tentang arsitektur aplikasi Seblak Prasmanan.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Aktor dan Role](#aktor-dan-role)
3. [Flow Diagram](#flow-diagram)
4. [Design Decisions](#design-decisions)
5. [Realtime Strategy](#realtime-strategy)

---

## High-Level Architecture

### Component Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├────────────────────────────────────────────────────────────────┤
│  Browser (Pelanggan)  │  Browser (Kasir)  │  Browser (Dapur)   │
│  - OrderForm          │  - KasirDashboard │  - DapurDashboard  │
│  - OrderTracking      │  - BowlScanner    │  - OrderQueue      │
│  - No Auth Required   │  - Auth: kasir    │  - Auth: dapur     │
└──────────────┬────────────────┬─────────────────┬──────────────┘
               │                │                 │
               └────────────────┴─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   tRPC Client Layer   │
                    │   (Type-safe calls)   │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────▼────────────────────────────────┐
│                      SERVER LAYER (Next.js)                     │
├────────────────────────────────────────────────────────────────┤
│  tRPC Routers:                                                  │
│  - bowls.ts       → Cek status wadah, get active order         │
│  - orders.ts      → Create, update, list orders                │
│  - payments.ts    → Confirm cash, Midtrans integration         │
│                                                                 │
│  Procedures:                                                    │
│  - publicProcedure    → Accessible by all (pelanggan)          │
│  - kasirProcedure     → Protected, role: kasir                 │
│  - dapurProcedure     → Protected, role: dapur                 │
└────────────────────────────┬───────────────────────────────────┘
                             │
                 ┌───────────▼──────────┐
                 │   Prisma ORM Client  │
                 └───────────┬──────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DATABASE LAYER (Supabase)                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  - bowls          → Wadah prasmanan (QR code holder)            │
│  - orders         → Pesanan pelanggan                           │
│  - payments       → Riwayat pembayaran                          │
│                                                                  │
│  Supabase Realtime (via WebSocket)                              │
│  - Subscribe ke changes pada tabel orders dan payments          │
│  - Push updates ke semua connected clients                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Aktor dan Role

### 1. Pelanggan

**Akses:** Public, tidak memerlukan authentication

**User Journey:**
1. Scan QR code di wadah prasmanan menggunakan HP
2. Browser redirect ke `/order/[bowlId]`
3. Isi form nama + preferensi rasa
4. Ambil bahan seblak secara fisik (prasmanan)
5. Serahkan wadah ke kasir
6. Browser redirect ke `/order/track/[orderId]`
7. Menunggu notifikasi harga (realtime)
8. Pilih bayar QRIS atau cash ke kasir
9. Makan seblak

**Fallback:** Jika tab tertutup atau notifikasi gagal, pelanggan tetap bisa bayar cash ke kasir dengan menyebutkan nama.

---

### 2. Kasir

**Akses:** Protected, memerlukan auth dengan role `kasir`

**User Journey:**
1. Login ke sistem dengan kredensial kasir
2. Buka dashboard kasir di `/kasir`
3. Terima wadah fisik dari pelanggan
4. Scan QR code wadah → sistem tampilkan data pelanggan
5. Hitung total harga secara manual
6. Input total harga di dashboard → sistem:
   - Kirim notifikasi ke pelanggan
   - Reset wadah (is_active: false)
   - Update status order: confirmed
7. Serahkan wadah ke dapur
8. Monitor status pembayaran secara realtime
9. Konfirmasi pembayaran (cash) atau terima notifikasi bayar online

---

### 3. Dapur

**Akses:** Protected, memerlukan auth dengan role `dapur`

**User Journey:**
1. Login ke sistem dengan kredensial dapur
2. Buka dashboard dapur di `/dapur`
3. Terima wadah fisik dari kasir (tidak perlu scan QR)
4. Lihat antrian pesanan di layar secara realtime
5. Klik "Mulai Masak" → status: preparing
6. Masak seblak sesuai preferensi yang tampil
7. Klik "Siap Diantar" → status: served
8. Antar seblak ke pelanggan berdasarkan nama

---

## Flow Diagram

### Complete Order Flow

```
[PELANGGAN]
    │
    ▼
① Ambil wadah prasmanan (fisik)
    │
    ▼
② Scan QR → redirect ke /order/bowl-A1
    │
    ▼
③ Tampil form jika wadah available
   (jika wadah is_active: true, tampil "Wadah sedang digunakan")
    │
    ▼
④ Submit form (nama + preferensi)
   → tRPC: orders.create
   → Database: INSERT order, UPDATE bowl.is_active = true
   → Redirect ke /order/track/[orderId]
    │
    ▼
⑤ Ambil bahan seblak (fisik)
    │
    ▼
⑥ Serahkan wadah ke kasir (fisik)
    │
    │
    ▼──────────────────────────────────────────────┐
[KASIR]                                             │
    │                                               │
    ▼                                               │
⑦ Scan QR wadah                                    │
   → tRPC: bowls.getActiveOrder                    │
   → Tampil data: nama + preferensi pelanggan      │
    │                                               │
    ▼                                               │
⑧ Hitung total harga (manual/timbangan)            │
    │                                               │
    ▼                                               │
⑨ Input total harga di dashboard                   │
   → tRPC: orders.updatePrice                      │
   → Database:                                      │
      - UPDATE order.total_price                    │
      - UPDATE order.status = 'confirmed'           │
      - UPDATE bowl.is_active = false ◄─────────────┘ WADAH RESET
   → Supabase Realtime push update
    │
    ▼
⑩ Teruskan wadah ke dapur (fisik)
    │
    │
    ▼──────────────────────────────────────────────┐
[DAPUR]                                             │
    │                                               │
    ▼                                               │
⑪ Dashboard dapur realtime menampilkan order baru  │
   (tidak perlu scan QR)                            │
    │                                               │
    ▼                                               │
⑫ Klik "Mulai Masak"                               │
   → tRPC: orders.updateStatus(preparing)          │
   → Supabase Realtime push update                 │
    │                                               │
    ▼                                               │
⑬ Masak seblak sesuai preferensi                   │
    │                                               │
    ▼                                               │
⑭ Klik "Siap Diantar"                              │
   → tRPC: orders.updateStatus(served)             │
   → Supabase Realtime push update                 │
    │                                               │
    ▼                                               │
⑮ Antar seblak ke pelanggan (fisik)                │
    │                                               │
    │                                               │
    ▼◄──────────────────────────────────────────────┘
[PELANGGAN TERIMA NOTIFIKASI HARGA]
    │
    ▼
⑯ Pelanggan pilih bayar:
   
   A) QRIS (Online via Midtrans)
      → tRPC: payments.createMidtrans
      → Redirect ke Midtrans payment page
      → Midtrans kirim webhook setelah bayar
      → Database: UPDATE order.payment_status = 'paid'
      → Supabase Realtime push update
      → Kasir otomatis lihat "LUNAS ✓"
   
   B) Cash ke kasir
      → Pelanggan sebutkan nama ke kasir
      → Kasir cari order di dashboard
      → Kasir klik "Konfirmasi Cash"
      → tRPC: payments.confirmCash
      → Database: UPDATE order.payment_status = 'paid'
      → Supabase Realtime push update
    │
    ▼
⑰ Order status: completed
```

---

## Design Decisions

### 1. Kenapa URL Tracking Terpisah dari URL Form?

**Problem:** URL awal `/order/[bowlId]` berbasis bowl ID. Jika pelanggan masih membuka tab dan wadah sudah direset untuk pelanggan lain, akan terjadi konflik.

**Solution:** 
- `/order/[bowlId]` → Hanya untuk form entry (stateless)
- `/order/track/[orderId]` → Untuk tracking (stateful, unik per order)

Setelah submit form, pelanggan langsung redirect ke URL tracking yang unik. Wadah bisa direset dan dipakai pelanggan lain tanpa mengganggu tracking pelanggan sebelumnya.

---

### 2. Kenapa Reset Wadah Setelah Kasir Input Harga, Bukan Setelah Pembayaran?

**Problem:** Pelanggan bayar setelah makan. Jika wadah menunggu pembayaran baru direset, wadah akan tertahan lama (15-30 menit).

**Solution:** Wadah direset segera setelah kasir input harga. Lifecycle wadah dan order terpisah:
- **Wadah:** Aktif saat pelanggan submit form → Reset saat kasir input harga (5-10 menit)
- **Order:** Tetap terbuka sampai pembayaran selesai

---

### 3. Kenapa Dapur Tidak Perlu Scan QR?

**Problem:** Menambah friction tanpa value. Kasir sudah scan QR dan pegang wadah fisik.

**Solution:** Kasir serahkan wadah ke dapur secara fisik. Dashboard dapur otomatis tampilkan pesanan baru via realtime. Dapur cukup lihat layar, tidak perlu scan QR ulang.

---

### 4. Kenapa Pakai tRPC Alih-alih REST API?

**Benefit:**
- ✅ **Type-safety end-to-end** — Frontend tahu persis shape data dari backend
- ✅ **Auto-completion** — IDE suggest available procedures dan input/output types
- ✅ **Less boilerplate** — Tidak perlu define OpenAPI schema atau manual type guards
- ✅ **Better DX** — Error messages yang jelas dengan Zod validation

**Trade-off:**
- ❌ Tidak bisa diakses dari luar Next.js (bukan public API)
- ✅ Oke untuk prototype karena semua consumer berada di Next.js yang sama

---

### 5. Kenapa Supabase Realtime Alih-alih WebSocket Custom?

**Benefit:**
- ✅ **Zero setup** — Langsung subscribe ke perubahan database
- ✅ **Scalable** — Supabase handle connection pooling dan load balancing
- ✅ **Reliable** — Auto-reconnect jika koneksi putus
- ✅ **Free tier generous** — Cukup untuk prototype dan small scale

**Trade-off:**
- ❌ Tergantung pada Supabase (vendor lock-in)
- ✅ Oke karena kita sudah pakai Supabase untuk database

---

## Realtime Strategy

### Tabel yang Di-watch

| Tabel | Event | Subscriber | Trigger | Purpose |
|---|---|---|---|---|
| `orders` | INSERT | Kasir, Dapur | Pelanggan submit form | Order baru muncul di dashboard |
| `orders` | UPDATE | Pelanggan, Kasir, Dapur | Status/harga berubah | Live update status pesanan |
| `payments` | INSERT | Kasir | Pembayaran online berhasil | Kasir lihat "LUNAS ✓" otomatis |

### Implementation Pattern

**Client-side (Browser):**

```typescript
import { supabase } from '@/lib/supabase'

// Subscribe ke perubahan order spesifik
const channel = supabase
  .channel(`order-${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, (payload) => {
    setOrder(payload.new) // Update UI
  })
  .subscribe()

// Cleanup saat unmount
return () => supabase.removeChannel(channel)
```

**Server-side (tRPC mutation):**

```typescript
// Kasir input harga
const updated = await prisma.order.update({
  where: { id: orderId },
  data: { totalPrice: price, status: 'confirmed' }
})

// Supabase Realtime otomatis push update ke semua subscriber
// Tidak perlu manual broadcast
```

---

## Security Considerations

### Authentication & Authorization (Planned with Clerk)

**Public Routes:**
- `/order/*` → Tidak perlu auth, accessible by anyone

**Protected Routes:**
- `/kasir` → Require auth, role: `kasir`
- `/dapur` → Require auth, role: `dapur`

**tRPC Procedures:**
- `publicProcedure` → Pelanggan bisa create order dan track order mereka
- `kasirProcedure` → Hanya kasir bisa update harga dan konfirmasi pembayaran
- `dapurProcedure` → Hanya dapur bisa update status preparing/served

### Data Privacy

- Pelanggan hanya bisa akses order mereka sendiri (via unique orderId)
- Kasir dan dapur bisa lihat semua order aktif (untuk operational purposes)
- Payment details (Midtrans order ID, transaction status) tidak exposed ke pelanggan

---

## Performance Considerations

### Database Indexes

```sql
-- Frequent queries by kasir and dapur
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_bowl_id ON orders(bowl_id);

-- Midtrans webhook lookup
CREATE INDEX idx_payments_midtrans_order_id ON payments(midtrans_order_id);
```

### Realtime Connection Management

- Setiap client hanya subscribe ke data yang mereka butuhkan:
  - Pelanggan: 1 channel untuk 1 order mereka
  - Kasir: 1 channel untuk semua orders + payments
  - Dapur: 1 channel untuk orders dengan status confirmed/preparing

- Cleanup subscriptions saat component unmount untuk avoid memory leaks

---

## Scalability Notes

**Current Prototype Scale:**
- 1 warung
- ~5-10 wadah prasmanan
- ~30-50 order per hari
- ~10-20 concurrent users (peak hour)

**If scaling to multi-warung:**
- Add `warung_id` foreign key ke semua tabel
- Implement multi-tenancy di tRPC context
- Shard Supabase Realtime channels per warung
- Consider Redis for session management jika Clerk rate limit tercapai

---

**Next:** [Database Schema Documentation](./Database.md)
