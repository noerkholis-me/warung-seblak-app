# Database Schema Documentation

Dokumentasi lengkap tentang database schema, relasi, dan design decisions.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Schema Diagram](#schema-diagram)
3. [Enums](#enums)
4. [Tables](#tables)
5. [Indexes](#indexes)
6. [Migrations](#migrations)

---

## Database Overview

**Database Provider:** PostgreSQL (via Supabase)  
**ORM:** Prisma  
**Features Used:**
- Enums untuk type safety
- Foreign key constraints
- Indexes untuk query optimization
- Supabase Realtime untuk live updates

---

## Schema Diagram

```
┌─────────────────────┐
│       bowls         │
├─────────────────────┤
│ id (PK)      TEXT   │◄────┐
│ is_active    BOOL   │     │
│ created_at   TS     │     │
└─────────────────────┘     │
                             │ 1:N
                             │
┌──────────────────────────┐│
│       orders             ││
├──────────────────────────┤│
│ id (PK)           UUID   ││
│ bowl_id (FK)      TEXT   │┘
│ customer_name     TEXT   │
│ preferences       JSONB  │
│ total_price       INT?   │
│ payment_method    ENUM?  │
│ payment_status    ENUM   │
│ status            ENUM   │
│ created_at        TS     │
│ updated_at        TS     │
└──────────────────────────┘
       │ 1:N
       │
       ▼
┌──────────────────────────┐
│      payments            │
├──────────────────────────┤
│ id (PK)           UUID   │
│ order_id (FK)     UUID   │
│ amount            INT    │
│ payment_method    ENUM   │
│ midtrans_order_id TEXT?  │
│ midtrans_status   ENUM?  │
│ created_at        TS     │
└──────────────────────────┘
```

---

## Enums

### OrderStatus

Status lifecycle dari sebuah order.

```prisma
enum OrderStatus {
  waiting     // Pelanggan baru submit form, menunggu kasir
  confirmed   // Kasir sudah input harga, pesanan dikonfirmasi
  preparing   // Dapur sedang memasak
  served      // Seblak sudah diantar ke pelanggan
  completed   // Pembayaran selesai, order completed
}
```

**Transition Flow:**
```
waiting → confirmed → preparing → served → completed
   ↑          ↑           ↑          ↑         ↑
pelanggan   kasir       dapur     dapur    payment
submit      input       mulai     selesai  berhasil
form        harga       masak     masak
```

---

### PaymentStatus

Status pembayaran dari order.

```prisma
enum PaymentStatus {
  pending   // Belum bayar
  paid      // Sudah bayar (cash atau online)
}
```

**Note:** Status `paid` berlaku untuk cash maupun online payment. Untuk distinguish payment method, lihat kolom `payment_method`.

---

### PaymentMethod

Metode pembayaran yang digunakan.

```prisma
enum PaymentMethod {
  cash   // Bayar tunai langsung ke kasir
  qris   // Bayar online via QRIS (Midtrans)
}
```

---

### MidtransStatus

Status transaksi dari Midtrans (untuk online payment).

```prisma
enum MidtransStatus {
  pending      // Transaksi dibuat, menunggu pembayaran
  settlement   // Pembayaran berhasil
  expire       // Transaksi expired (tidak dibayar dalam waktu yang ditentukan)
  cancel       // Transaksi dibatalkan oleh user
  deny         // Pembayaran ditolak (kartu tidak valid, saldo tidak cukup, dll)
  failure      // Transaksi gagal karena technical error
}
```

**Mapping to PaymentStatus:**
- `settlement` → `paid`
- `pending`, `expire`, `cancel`, `deny`, `failure` → tetap `pending` (belum bayar)

---

## Tables

### Table: `bowls`

Representasi wadah fisik yang digunakan di area prasmanan. Setiap wadah punya QR code unik yang tertempel permanen.

```prisma
model Bowl {
  id        String   @id                      // e.g., "bowl-A1", "bowl-A2"
  isActive  Boolean  @default(false)          // true jika sedang dipakai pelanggan
  createdAt DateTime @default(now())
  orders    Order[]                           // Relasi ke orders

  @@map("bowls")
}
```

**Kolom:**

| Kolom | Type | Nullable | Description |
|---|---|---|---|
| `id` | TEXT | NOT NULL | ID unik wadah (e.g., "bowl-A1"). Ini adalah primary key dan reference untuk QR code. |
| `is_active` | BOOLEAN | NOT NULL | Flag apakah wadah sedang dipakai. `true` saat pelanggan submit form, `false` saat kasir input harga. |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp saat wadah ditambahkan ke sistem. |

**Lifecycle:**

```
① Wadah available
   is_active: false
        ↓
② Pelanggan scan QR + submit form
   is_active: true
        ↓
③ Kasir input total harga
   is_active: false  ← RESET DI SINI
        ↓
④ Order masih aktif sampai pembayaran selesai
   (wadah sudah bisa dipakai pelanggan lain)
```

**Business Rules:**
- Wadah dengan `is_active: true` tidak bisa di-scan pelanggan lain
- Saat kasir input harga, wadah otomatis reset (`is_active: false`)
- Satu wadah bisa punya banyak order sepanjang waktu, tapi hanya 1 order aktif dalam satu waktu

---

### Table: `orders`

Representasi pesanan pelanggan.

```prisma
model Order {
  id            String         @id @default(uuid())
  bowlId        String                                  // FK ke bowls
  customerName  String
  preferences   Json           @default("{}")           // Preferensi rasa pelanggan
  totalPrice    Int?                                    // Dalam Rupiah, diisi oleh kasir
  paymentMethod PaymentMethod?                          // Diisi setelah pembayaran
  paymentStatus PaymentStatus  @default(pending)
  status        OrderStatus    @default(waiting)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  bowl          Bowl           @relation(fields: [bowlId], references: [id])
  payments      Payment[]

  @@map("orders")
}
```

**Kolom:**

| Kolom | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key, auto-generated. |
| `bowl_id` | TEXT | NOT NULL | Foreign key ke `bowls.id`. Wadah mana yang digunakan untuk order ini. |
| `customer_name` | TEXT | NOT NULL | Nama pelanggan yang diinput sendiri di form. |
| `preferences` | JSONB | NOT NULL | Preferensi rasa (level pedas, kuah/nyemek/kering, asin/manis/normal, catatan). |
| `total_price` | INTEGER | NULLABLE | Total harga dalam Rupiah. NULL sampai kasir input harga. |
| `payment_method` | ENUM | NULLABLE | Metode pembayaran (cash/qris). NULL sampai pembayaran selesai. |
| `payment_status` | ENUM | NOT NULL | Status pembayaran (pending/paid). Default: pending. |
| `status` | ENUM | NOT NULL | Status order (waiting/confirmed/preparing/served/completed). Default: waiting. |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp saat order dibuat (pelanggan submit form). |
| `updated_at` | TIMESTAMP | NOT NULL | Timestamp terakhir order diupdate (auto-managed by Prisma). |

**JSON Structure untuk `preferences`:**

```json
{
  "broth": "kuah",           // "kuah" | "nyemek" | "kering"
  "spicy_level": 3,          // 1-5
  "taste": "normal",         // "asin" | "manis" | "normal"
  "extra_notes": "..."       // Optional, string catatan tambahan
}
```

**Business Rules:**
- Satu order hanya bisa terkait dengan satu wadah (via `bowl_id`)
- `total_price` hanya bisa diisi oleh kasir
- `payment_status` menjadi `paid` setelah pembayaran berhasil (cash atau online)
- `status` progression: waiting → confirmed → preparing → served → completed

---

### Table: `payments`

Riwayat pembayaran. Terpisah dari `orders` karena satu order bisa punya multiple payment attempts.

```prisma
model Payment {
  id              String          @id @default(uuid())
  orderId         String                                // FK ke orders
  amount          Int                                   // Jumlah yang dibayar (Rupiah)
  paymentMethod   PaymentMethod                         // cash atau qris
  midtransOrderId String?         @unique               // Order ID dari Midtrans
  midtransStatus  MidtransStatus?                       // Status dari Midtrans
  createdAt       DateTime        @default(now())
  order           Order           @relation(fields: [orderId], references: [id])

  @@map("payments")
}
```

**Kolom:**

| Kolom | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key, auto-generated. |
| `order_id` | UUID | NOT NULL | Foreign key ke `orders.id`. Payment untuk order mana. |
| `amount` | INTEGER | NOT NULL | Jumlah yang dibayar dalam Rupiah. Harus sama dengan `orders.total_price`. |
| `payment_method` | ENUM | NOT NULL | Metode pembayaran (cash/qris). |
| `midtrans_order_id` | TEXT | NULLABLE | Order ID dari Midtrans. NULL jika cash. UNIQUE constraint untuk avoid duplicate. |
| `midtrans_status` | ENUM | NULLABLE | Status transaksi dari Midtrans. NULL jika cash. |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp saat payment record dibuat. |

**Business Rules:**
- Satu order bisa punya multiple payment records (misalnya attempt QRIS gagal, lalu bayar cash)
- Untuk cash payment: `midtrans_order_id` dan `midtrans_status` NULL
- Untuk online payment: `midtrans_order_id` dan `midtrans_status` harus diisi
- `midtrans_order_id` harus unique untuk avoid duplicate payment

**Use Cases:**

**Scenario 1: Bayar Cash**
```sql
INSERT INTO payments (order_id, amount, payment_method)
VALUES ('uuid-123', 25000, 'cash');
```

**Scenario 2: Bayar QRIS**
```sql
INSERT INTO payments (order_id, amount, payment_method, midtrans_order_id, midtrans_status)
VALUES ('uuid-123', 25000, 'qris', 'ORDER-2024-123', 'pending');
```

Lalu Midtrans webhook update:
```sql
UPDATE payments
SET midtrans_status = 'settlement'
WHERE midtrans_order_id = 'ORDER-2024-123';
```

---

## Indexes

Indexes yang dibuat untuk optimize query performance.

```sql
-- Kasir sering query order berdasarkan bowl_id saat scan QR
CREATE INDEX idx_orders_bowl_id ON orders(bowl_id);

-- Dashboard kasir dan dapur sering filter by status
CREATE INDEX idx_orders_status ON orders(status);

-- Kasir perlu lihat semua order yang belum bayar
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Midtrans webhook butuh lookup cepat by midtrans_order_id
CREATE INDEX idx_payments_midtrans_order_id ON payments(midtrans_order_id);
```

**Performance Impact:**

| Query | Without Index | With Index |
|---|---|---|
| `SELECT * FROM orders WHERE bowl_id = 'bowl-A1'` | Full table scan (O(n)) | Index seek (O(log n)) |
| `SELECT * FROM orders WHERE status = 'confirmed'` | Full table scan | Index seek |
| `SELECT * FROM payments WHERE midtrans_order_id = 'ORDER-123'` | Full table scan | Index seek (UNIQUE) |

---

## Migrations

### Migration History

#### 1. Initial Database (`20260217145618_init_db`)

```sql
CREATE TABLE "bowls" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bowls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "bowl_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "total_price" INTEGER,
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "midtrans_order_id" TEXT,
    "midtrans_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders" ADD CONSTRAINT "orders_bowl_id_fkey"
    FOREIGN KEY ("bowl_id") REFERENCES "bowls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payments_midtrans_order_id_key"
    ON "payments"("midtrans_order_id");
```

---

#### 2. Add Enums (`20260218085148_add_enums`)

Mengubah kolom TEXT menjadi proper Postgres ENUMs untuk type safety.

```sql
-- Create enums
CREATE TYPE "OrderStatus" AS ENUM ('waiting', 'confirmed', 'preparing', 'served', 'completed');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'qris');
CREATE TYPE "MidtransStatus" AS ENUM ('pending', 'settlement', 'expire', 'cancel', 'deny', 'failure');

-- Alter orders table
ALTER TABLE "orders"
  DROP COLUMN "payment_method",
  ADD COLUMN "payment_method" "PaymentMethod",
  DROP COLUMN "payment_status",
  ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  DROP COLUMN "status",
  ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'waiting';

-- Alter payments table
ALTER TABLE "payments"
  DROP COLUMN "payment_method",
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL,
  DROP COLUMN "midtrans_status",
  ADD COLUMN "midtrans_status" "MidtransStatus";
```

**Benefits:**
- ✅ Type safety di database level
- ✅ Prisma auto-generate TypeScript enums
- ✅ Prevent invalid values di database
- ✅ Better query optimization oleh PostgreSQL

---

## Prisma Schema File

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// --- ENUMS ---

enum OrderStatus {
  waiting
  confirmed
  preparing
  served
  completed
}

enum PaymentStatus {
  pending
  paid
}

enum PaymentMethod {
  cash
  qris
}

enum MidtransStatus {
  pending
  settlement
  expire
  cancel
  deny
  failure
}

// --- MODELS ---

model Bowl {
  id        String   @id
  isActive  Boolean  @default(false) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  orders    Order[]

  @@map("bowls")
}

model Order {
  id            String         @id @default(uuid())
  bowlId        String         @map("bowl_id")
  customerName  String         @map("customer_name")
  preferences   Json           @default("{}")
  totalPrice    Int?           @map("total_price")
  paymentMethod PaymentMethod? @map("payment_method")
  paymentStatus PaymentStatus  @default(pending) @map("payment_status")
  status        OrderStatus    @default(waiting)
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  bowl          Bowl           @relation(fields: [bowlId], references: [id])
  payments      Payment[]

  @@map("orders")
}

model Payment {
  id              String          @id @default(uuid())
  orderId         String          @map("order_id")
  amount          Int
  paymentMethod   PaymentMethod   @map("payment_method")
  midtransOrderId String?         @unique @map("midtrans_order_id")
  midtransStatus  MidtransStatus? @map("midtrans_status")
  createdAt       DateTime        @default(now()) @map("created_at")
  order           Order           @relation(fields: [orderId], references: [id])

  @@map("payments")
}
```

---

## Seeding Data

Untuk development, kita seed 5 wadah:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const bowls = ['bowl-A1', 'bowl-A2', 'bowl-A3', 'bowl-A4', 'bowl-A5']

  for (const id of bowls) {
    await prisma.bowl.upsert({
      where: { id },
      update: {},
      create: { id, isActive: false },
    })
  }

  console.log('✅ Seed berhasil — 5 bowl tersedia')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run seed:
```bash
npx prisma db seed
```

---

## Query Examples

### Common Queries

**1. Cek apakah wadah tersedia:**
```typescript
const bowl = await prisma.bowl.findUnique({
  where: { id: 'bowl-A1' }
})

if (!bowl) throw new Error('Wadah tidak ditemukan')
if (bowl.isActive) throw new Error('Wadah sedang digunakan')
```

**2. Buat order baru + aktifkan wadah:**
```typescript
const order = await prisma.$transaction(async (tx) => {
  await tx.bowl.update({
    where: { id: 'bowl-A1' },
    data: { isActive: true }
  })

  return tx.order.create({
    data: {
      bowlId: 'bowl-A1',
      customerName: 'Budi',
      preferences: {
        broth: 'kuah',
        spicy_level: 3,
        taste: 'normal'
      }
    }
  })
})
```

**3. List semua order aktif (untuk kasir):**
```typescript
const orders = await prisma.order.findMany({
  where: {
    status: {
      in: ['waiting', 'confirmed', 'preparing', 'served']
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 50
})
```

**4. Update harga + reset wadah:**
```typescript
const updated = await prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({ where: { id: orderId } })
  
  await tx.bowl.update({
    where: { id: order.bowlId },
    data: { isActive: false }
  })

  return tx.order.update({
    where: { id: orderId },
    data: {
      totalPrice: 25000,
      status: 'confirmed'
    }
  })
})
```

**5. Konfirmasi pembayaran cash:**
```typescript
await prisma.$transaction([
  prisma.payment.create({
    data: {
      orderId: 'uuid-123',
      amount: 25000,
      paymentMethod: 'cash'
    }
  }),
  prisma.order.update({
    where: { id: 'uuid-123' },
    data: {
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      status: 'completed'
    }
  })
])
```

---

**Next:** [API Documentation (tRPC)](./API.md)
