# API Documentation (tRPC)

Dokumentasi lengkap tentang tRPC routers, procedures, dan usage examples.

---

## Table of Contents

1. [tRPC Overview](#trpc-overview)
2. [Authentication (Planned)](#authentication-planned)
3. [Router Structure](#router-structure)
4. [Bowls Router](#bowls-router)
5. [Orders Router](#orders-router)
6. [Payments Router](#payments-router)
7. [Client Usage Examples](#client-usage-examples)

---

## tRPC Overview

**tRPC** (TypeScript Remote Procedure Call) memberikan type-safe API layer antara client dan server tanpa code generation atau schema definitions manual.

### Benefits

✅ **End-to-end type safety** — Frontend tahu persis shape data dari backend  
✅ **Auto-completion** — IDE suggest available procedures dan parameter types  
✅ **Zod validation** — Input validation terintegrasi dengan error handling yang jelas  
✅ **Less boilerplate** — Tidak perlu REST endpoint definitions atau OpenAPI schema  

### Architecture

```
Client (React)
     │
     ▼
tRPC Client (@trpc/react-query)
     │
     ▼
HTTP Request (POST /api/trpc)
     │
     ▼
tRPC Server (@trpc/server)
     │
     ▼
Router Procedures
     │
     ▼
Prisma ORM
     │
     ▼
PostgreSQL Database
```

---

## Authentication (Planned)

### Context

Setiap tRPC procedure memiliki akses ke context yang berisi informasi user.

```typescript
// src/server/context.ts
import { auth } from '@clerk/nextjs/server'

export const createContext = async () => {
  const { userId, sessionClaims } = await auth()
  
  return {
    userId,
    role: sessionClaims?.metadata?.role as string | undefined,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### Procedure Types

**1. Public Procedure** — Accessible tanpa authentication
```typescript
export const publicProcedure = t.procedure
```

**2. Protected Procedure** — Require authentication, any role
```typescript
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
```

**3. Kasir Procedure** — Require role: kasir
```typescript
const isKasir = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (ctx.role !== 'kasir') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

export const kasirProcedure = t.procedure.use(isKasir)
```

**4. Dapur Procedure** — Require role: dapur
```typescript
const isDapur = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (ctx.role !== 'dapur') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

export const dapurProcedure = t.procedure.use(isDapur)
```

---

## Router Structure

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc'
import { bowlsRouter } from './bowls'
import { ordersRouter } from './orders'
import { paymentsRouter } from './payments'

export const appRouter = router({
  bowls: bowlsRouter,
  orders: ordersRouter,
  payments: paymentsRouter,
})

export type AppRouter = typeof appRouter
```

Client dapat memanggil procedures dengan syntax:
```typescript
trpc.bowls.getById.useQuery({ id: 'bowl-A1' })
trpc.orders.create.useMutation()
trpc.payments.confirmCash.useMutation()
```

---

## Bowls Router

Router untuk operasi terkait wadah prasmanan.

### Procedures

#### `bowls.getById`

Cek apakah wadah exist dan statusnya.

**Type:** Query (public)  
**Input:**
```typescript
{
  id: string  // Bowl ID, e.g., "bowl-A1"
}
```

**Output:**
```typescript
{
  bowl: {
    id: string
    isActive: boolean
    createdAt: Date
  }
}
```

**Error Cases:**
- `TRPCError { code: 'NOT_FOUND' }` jika wadah tidak ditemukan

**Example:**
```typescript
const { data, error } = trpc.bowls.getById.useQuery({
  id: 'bowl-A1'
})

if (error) {
  console.error('Wadah tidak ditemukan')
}

if (data?.bowl.isActive) {
  console.log('Wadah sedang digunakan')
}
```

---

#### `bowls.getActiveOrder`

Ambil order aktif dari wadah tertentu (jika ada).

**Type:** Query (public)  
**Input:**
```typescript
{
  bowlId: string  // Bowl ID
}
```

**Output:**
```typescript
{
  order: {
    id: string
    customerName: string
    preferences: {
      broth: 'kuah' | 'nyemek' | 'kering'
      spicy_level: number  // 1-5
      taste: 'normal' | 'asin' | 'manis'
      extra_notes?: string
    }
    totalPrice: number | null
    status: OrderStatus
    createdAt: Date
  } | null  // null jika tidak ada order aktif
}
```

**Example:**
```typescript
const { data } = await trpc.bowls.getActiveOrder.useQuery({
  bowlId: 'bowl-A1'
})

if (!data?.order) {
  console.log('Wadah ini tidak punya order aktif')
} else {
  console.log('Order ditemukan:', data.order.customerName)
}
```

---

## Orders Router

Router untuk operasi terkait pesanan.

### Procedures

#### `orders.create`

Buat order baru (digunakan pelanggan saat submit form).

**Type:** Mutation (public)  
**Input:**
```typescript
{
  bowl_id: string
  customer_name: string  // Min 1 char, max 50 char
  preferences: {
    broth: 'kuah' | 'nyemek' | 'kering'
    spicy_level: number  // 1-5
    taste: 'normal' | 'asin' | 'manis'
    extra_notes?: string  // Max 200 char
  }
}
```

**Output:**
```typescript
{
  order: {
    id: string  // UUID yang baru dibuat
    bowlId: string
    customerName: string
    preferences: {...}
    totalPrice: null  // Belum ada harga
    paymentStatus: 'pending'
    status: 'waiting'
    createdAt: Date
  }
}
```

**Error Cases:**
- `Wadah tidak ditemukan` jika bowl_id invalid
- `Wadah sedang digunakan` jika bowl.isActive === true

**Side Effects:**
- Bowl.isActive menjadi true
- Order baru masuk database

**Example:**
```typescript
const createOrder = trpc.orders.create.useMutation()

const handleSubmit = async (data) => {
  try {
    const result = await createOrder.mutateAsync({
      bowl_id: 'bowl-A1',
      customer_name: 'Budi',
      preferences: {
        broth: 'kuah',
        spicy_level: 3,
        taste: 'normal',
      }
    })
    
    router.push(`/order/track/${result.order.id}`)
  } catch (error) {
    console.error(error.message)
  }
}
```

---

#### `orders.getById`

Ambil detail order berdasarkan ID (digunakan pelanggan untuk tracking).

**Type:** Query (public)  
**Input:**
```typescript
{
  id: string  // Order UUID
}
```

**Output:**
```typescript
{
  order: {
    id: string
    customerName: string
    preferences: {...}
    totalPrice: number | null
    paymentStatus: 'pending' | 'paid'
    paymentMethod: 'cash' | 'qris' | null
    status: OrderStatus
    createdAt: Date
    updatedAt: Date
  }
}
```

**Error Cases:**
- `Pesanan tidak ditemukan` jika order ID invalid

**Example:**
```typescript
const { data } = trpc.orders.getById.useQuery({
  id: orderId
})

if (data?.order.totalPrice) {
  console.log('Total harga:', data.order.totalPrice)
} else {
  console.log('Menunggu kasir input harga...')
}
```

---

#### `orders.updatePrice`

Update total harga order (digunakan kasir).

**Type:** Mutation (kasir only - planned auth)  
**Input:**
```typescript
{
  orderId: string
  totalPrice: number  // Min 1000 (Rp 1.000)
}
```

**Output:**
```typescript
{
  order: {
    id: string
    totalPrice: number
    status: 'confirmed'
    // ... other fields
  }
}
```

**Side Effects:**
- Order.totalPrice diupdate
- Order.status menjadi 'confirmed'
- Bowl.isActive menjadi false (wadah direset)
- Supabase Realtime push update ke pelanggan

**Error Cases:**
- `Order tidak ditemukan` jika orderId invalid
- Zod validation error jika totalPrice < 1000

**Example:**
```typescript
const updatePrice = trpc.orders.updatePrice.useMutation()

const handleSubmit = async () => {
  await updatePrice.mutateAsync({
    orderId: 'uuid-123',
    totalPrice: 25000
  })
  
  console.log('Harga berhasil diupdate, notifikasi terkirim ke pelanggan')
}
```

---

#### `orders.updateStatus`

Update status order (digunakan dapur).

**Type:** Mutation (dapur only - planned auth)  
**Input:**
```typescript
{
  orderId: string
  status: 'waiting' | 'confirmed' | 'preparing' | 'served' | 'completed'
}
```

**Output:**
```typescript
{
  order: {
    id: string
    status: OrderStatus
    // ... other fields
  }
}
```

**Side Effects:**
- Order.status diupdate
- Supabase Realtime push update ke kasir dan pelanggan

**Example:**
```typescript
const updateStatus = trpc.orders.updateStatus.useMutation()

// Dapur klik "Mulai Masak"
await updateStatus.mutateAsync({
  orderId: 'uuid-123',
  status: 'preparing'
})

// Dapur klik "Siap Diantar"
await updateStatus.mutateAsync({
  orderId: 'uuid-123',
  status: 'served'
})
```

---

#### `orders.listActive`

List semua order aktif (digunakan kasir dan dapur).

**Type:** Query (kasir/dapur only - planned auth)  
**Input:** None

**Output:**
```typescript
{
  orders: Array<{
    id: string
    bowlId: string
    customerName: string
    preferences: {...}
    totalPrice: number | null
    paymentStatus: 'pending' | 'paid'
    status: OrderStatus
    createdAt: Date
  }>
}
```

**Filters:**
- Status: waiting, confirmed, preparing, served
- Order: DESC by createdAt
- Limit: 50 orders terakhir

**Example:**
```typescript
const { data } = trpc.orders.listActive.useQuery()

const waitingOrders = data?.orders.filter(o => o.status === 'waiting')
const confirmedOrders = data?.orders.filter(o => o.status === 'confirmed')
```

---

## Payments Router

Router untuk operasi terkait pembayaran.

### Procedures

#### `payments.confirmCash`

Konfirmasi pembayaran cash (digunakan kasir).

**Type:** Mutation (kasir only - planned auth)  
**Input:**
```typescript
{
  orderId: string
}
```

**Output:**
```typescript
{
  payment: {
    id: string
    orderId: string
    amount: number
    paymentMethod: 'cash'
    createdAt: Date
  }
}
```

**Side Effects:**
- Payment record dibuat dengan method: cash
- Order.paymentStatus menjadi 'paid'
- Order.paymentMethod menjadi 'cash'
- Order.status menjadi 'completed'
- Supabase Realtime push update

**Error Cases:**
- `Order tidak ditemukan` jika orderId invalid
- `Harga belum diinput kasir` jika totalPrice masih null
- `Order sudah dibayar` jika paymentStatus sudah 'paid'

**Example:**
```typescript
const confirmCash = trpc.payments.confirmCash.useMutation()

const handleConfirm = async (orderId: string) => {
  try {
    await confirmCash.mutateAsync({ orderId })
    console.log('Pembayaran cash berhasil dikonfirmasi')
  } catch (error) {
    console.error(error.message)
  }
}
```

---

#### `payments.createMidtrans` (Planned)

Buat transaksi Midtrans untuk pembayaran online.

**Type:** Mutation (public)  
**Input:**
```typescript
{
  orderId: string
}
```

**Output:**
```typescript
{
  payment: {
    id: string
    midtransOrderId: string
    midtransStatus: 'pending'
  },
  paymentUrl: string  // URL redirect ke Midtrans
}
```

**Side Effects:**
- Payment record dibuat dengan method: qris
- Midtrans transaction dibuat via API
- User redirect ke Midtrans payment page

**Example:**
```typescript
const createPayment = trpc.payments.createMidtrans.useMutation()

const handlePayQRIS = async () => {
  const result = await createPayment.mutateAsync({
    orderId: orderId
  })
  
  // Redirect ke Midtrans
  window.location.href = result.paymentUrl
}
```

---

#### `payments.handleWebhook` (Planned - Server Only)

Handle webhook dari Midtrans setelah pembayaran.

**Type:** Internal (not exposed to client)  
**Input:** Midtrans webhook payload

**Side Effects:**
- Update payment.midtransStatus
- Update order.paymentStatus menjadi 'paid' jika settlement
- Update order.status menjadi 'completed'
- Supabase Realtime push update

---

## Client Usage Examples

### Setup tRPC Client

```typescript
// src/lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()
```

---

### React Query Integration

tRPC hooks menggunakan React Query di balik layar, sehingga mendapat benefit caching dan refetching otomatis.

```typescript
'use client'

import { trpc } from '@/lib/trpc/client'

export function OrderTracking({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = trpc.orders.getById.useQuery({
    id: orderId
  })

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <div>
      <h1>Order untuk {data.order.customerName}</h1>
      {data.order.totalPrice ? (
        <p>Total: Rp {data.order.totalPrice.toLocaleString()}</p>
      ) : (
        <p>Menunggu kasir...</p>
      )}
    </div>
  )
}
```

---

### Mutations with Optimistic Updates

```typescript
'use client'

import { trpc } from '@/lib/trpc/client'

export function KasirDashboard() {
  const utils = trpc.useUtils()
  
  const updatePrice = trpc.orders.updatePrice.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.orders.listActive.cancel()
      
      // Snapshot previous value
      const previous = utils.orders.listActive.getData()
      
      // Optimistically update
      utils.orders.listActive.setData(undefined, (old) => 
        old?.orders.map(o => 
          o.id === variables.orderId 
            ? { ...o, totalPrice: variables.totalPrice, status: 'confirmed' }
            : o
        )
      )
      
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      utils.orders.listActive.setData(undefined, context?.previous)
    },
    onSettled: () => {
      // Refetch after mutation
      utils.orders.listActive.invalidate()
    }
  })

  return (
    <button onClick={() => updatePrice.mutate({ orderId: '...', totalPrice: 25000 })}>
      Update Harga
    </button>
  )
}
```

---

### Prefetching for Better UX

```typescript
'use client'

import { trpc } from '@/lib/trpc/client'

export function BowlScanner() {
  const utils = trpc.useUtils()

  const handleScan = async (bowlId: string) => {
    // Prefetch bowl data
    await utils.bowls.getById.prefetch({ id: bowlId })
    
    // Prefetch active order if exists
    await utils.bowls.getActiveOrder.prefetch({ bowlId })
    
    // Data sudah di cache, query berikutnya instant
  }

  return <QRScanner onScan={handleScan} />
}
```

---

### Error Handling

```typescript
const createOrder = trpc.orders.create.useMutation({
  onSuccess: (data) => {
    router.push(`/order/track/${data.order.id}`)
  },
  onError: (error) => {
    if (error.message.includes('Wadah sedang digunakan')) {
      toast.error('Wadah ini sedang digunakan, silakan ambil wadah lain')
    } else {
      toast.error('Terjadi kesalahan, coba lagi')
    }
  }
})
```

---

## Testing tRPC Procedures

### Unit Testing with Vitest

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { appRouter } from '@/server/routers/_app'
import { prisma } from '@/lib/prisma'

describe('orders.create', () => {
  beforeEach(async () => {
    await prisma.order.deleteMany()
    await prisma.bowl.create({ data: { id: 'bowl-test', isActive: false } })
  })

  it('should create order successfully', async () => {
    const caller = appRouter.createCaller({ userId: null, role: null })
    
    const result = await caller.orders.create({
      bowl_id: 'bowl-test',
      customer_name: 'Test User',
      preferences: {
        broth: 'kuah',
        spicy_level: 3,
        taste: 'normal'
      }
    })

    expect(result.order.customerName).toBe('Test User')
    expect(result.order.status).toBe('waiting')
  })

  it('should throw error if bowl is active', async () => {
    await prisma.bowl.update({
      where: { id: 'bowl-test' },
      data: { isActive: true }
    })

    const caller = appRouter.createCaller({ userId: null, role: null })
    
    await expect(
      caller.orders.create({
        bowl_id: 'bowl-test',
        customer_name: 'Test User',
        preferences: { broth: 'kuah', spicy_level: 3, taste: 'normal' }
      })
    ).rejects.toThrow('Wadah sedang digunakan')
  })
})
```

---

**Next:** [Deployment Guide](./Deployment.md)
