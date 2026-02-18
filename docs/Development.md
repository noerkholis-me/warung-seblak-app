# Development Guide

Panduan untuk setup local development dan best practices.

---

## Table of Contents

1. [Local Setup](#local-setup)
2. [Development Workflow](#development-workflow)
3. [Code Structure](#code-structure)
4. [Best Practices](#best-practices)
5. [Testing](#testing)
6. [Debugging](#debugging)

---

## Local Setup

### Prerequisites

- Node.js 18+ (`node --version`)
- pnpm/npm/yarn
- PostgreSQL client (untuk manual DB inspection)
- Git

---

### Installation Steps

```bash
# Clone repository
git clone <repository-url>
cd seblak-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase dan Midtrans

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database dengan 5 wadah
npx prisma db seed

# Start development server
npm run dev
```

Open browser: `http://localhost:3000`

---

### Verify Setup

Test semua routes:

```bash
# Pelanggan
open http://localhost:3000/order/bowl-A1

# Kasir
open http://localhost:3000/kasir

# Dapur (setelah Phase 4)
open http://localhost:3000/dapur
```

---

## Development Workflow

### Feature Development

```bash
# Create feature branch
git checkout -b feature/nama-fitur

# Develop...
# Commit frequently dengan message yang jelas
git add .
git commit -m "feat: add feature X"

# Push ke GitHub
git push origin feature/nama-fitur

# Create Pull Request
```

---

### Database Changes

Jika perlu ubah schema:

```bash
# 1. Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_new_field

# 3. Prisma client auto-regenerate
# Jika tidak, run manual:
npx prisma generate
```

**Migration naming convention:**
- `add_field_x` — menambah kolom
- `create_table_y` — buat tabel baru
- `update_enum_z` — ubah enum values
- `add_index_a` — tambah index

---

### Adding New tRPC Procedure

**1. Define Zod schema** (jika perlu):
```typescript
// src/features/[feature]/schemas/[feature].schema.ts
import { z } from 'zod'

export const myInputSchema = z.object({
  field: z.string().min(1),
})

export type MyInput = z.infer<typeof myInputSchema>
```

**2. Add procedure ke router:**
```typescript
// src/server/routers/[router].ts
import { router, publicProcedure } from '../trpc'
import { myInputSchema } from '@/features/[feature]/schemas'

export const myRouter = router({
  myProcedure: publicProcedure
    .input(myInputSchema)
    .mutation(async ({ input }) => {
      // Logic here
      return { success: true }
    }),
})
```

**3. Export dari app router:**
```typescript
// src/server/routers/_app.ts
import { myRouter } from './myRouter'

export const appRouter = router({
  // ... existing routers
  myFeature: myRouter,
})
```

**4. Use in client:**
```typescript
'use client'
import { trpc } from '@/lib/trpc/client'

const myMutation = trpc.myFeature.myProcedure.useMutation()

const handleClick = async () => {
  await myMutation.mutateAsync({ field: 'value' })
}
```

---

### Adding New Shadcn Component

```bash
# Add component
npx shadcn@latest add [component-name]

# Example
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Component akan otomatis ditambahkan ke `src/components/ui/`.

---

## Code Structure

### Feature-Based Organization

```
src/
├── features/
│   ├── order/          # Feature pelanggan
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── actions/    # Server actions (jika perlu)
│   │
│   ├── kasir/          # Feature kasir
│   └── dapur/          # Feature dapur
│
├── server/             # tRPC backend
│   ├── routers/
│   ├── trpc.ts
│   └── context.ts
│
├── lib/                # Shared utilities
│   ├── prisma.ts
│   ├── supabase.ts
│   └── trpc/
│
└── app/                # Next.js App Router
    ├── order/
    ├── kasir/
    ├── dapur/
    └── api/
```

**Guidelines:**
- Setiap feature memiliki folder sendiri
- Components specific ke feature tetap di feature folder
- Shared components masuk ke `src/components/ui/` (Shadcn)
- tRPC routers di `src/server/routers/`

---

### File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React Component | PascalCase | `OrderForm.tsx` |
| Hook | camelCase, prefix `use` | `useOrderRealtime.ts` |
| Schema | camelCase, suffix `.schema` | `order.schema.ts` |
| Router | camelCase, suffix `.ts` | `orders.ts` |
| Types | camelCase, suffix `.types` | `order.types.ts` |
| Utility | camelCase | `formatCurrency.ts` |

---

## Best Practices

### TypeScript

**✅ DO:**
```typescript
// Explicit types untuk function parameters
function processOrder(orderId: string, price: number): Promise<Order> {
  // ...
}

// Infer types dari Zod schemas
const input = orderSchema.parse(data)
type OrderInput = z.infer<typeof orderSchema>

// Use Prisma types
import { Order, OrderStatus } from '@prisma/client'
```

**❌ DON'T:**
```typescript
// Avoid `any`
function processOrder(orderId: any, price: any) {
  // ...
}

// Manual type definitions jika sudah ada dari Prisma/Zod
type Order = {
  id: string
  // ...
}
```

---

### React Hooks

**✅ DO:**
```typescript
// Separate hooks untuk logic yang complex
function useOrderTracking(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  
  useEffect(() => {
    // Subscribe logic
  }, [orderId])
  
  return { order, isLoading, error }
}

// Use dalam component
function OrderPage() {
  const { order, isLoading } = useOrderTracking(orderId)
  // ...
}
```

**❌ DON'T:**
```typescript
// Jangan taruh semua logic di component
function OrderPage() {
  const [order, setOrder] = useState()
  useEffect(() => {
    // 50 lines of subscription logic...
  }, [])
  
  // 100 lines of component logic...
}
```

---

### tRPC Best Practices

**✅ DO:**
```typescript
// Validate input dengan Zod
export const ordersRouter = router({
  create: publicProcedure
    .input(createOrderSchema)  // Zod validation
    .mutation(async ({ input }) => {
      // input is type-safe here
    }),
})

// Use transactions untuk atomic operations
const result = await prisma.$transaction(async (tx) => {
  await tx.bowl.update(...)
  return tx.order.create(...)
})
```

**❌ DON'T:**
```typescript
// Jangan skip input validation
create: publicProcedure
  .mutation(async ({ input }) => {
    // input bisa apa saja, unsafe!
  })

// Jangan multiple update tanpa transaction
await prisma.bowl.update(...)  // Jika ini success tapi...
await prisma.order.create(...)  // ...ini fail, data inconsistent
```

---

### Error Handling

**✅ DO:**
```typescript
// Throw descriptive errors
if (!bowl) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Wadah tidak ditemukan'
  })
}

// Handle errors di client
const mutation = trpc.orders.create.useMutation({
  onError: (error) => {
    toast.error(error.message)
  }
})
```

**❌ DON'T:**
```typescript
// Generic errors tidak membantu debugging
if (!bowl) {
  throw new Error('Error')
}

// Silent failures
const mutation = trpc.orders.create.useMutation()
// Tidak handle error sama sekali
```

---

### Performance

**✅ DO:**
```typescript
// Paginate large queries
const orders = await prisma.order.findMany({
  take: 50,
  skip: page * 50,
  orderBy: { createdAt: 'desc' }
})

// Use indexes untuk frequent queries
// Already defined in schema:
@@index([status])
@@index([payment_status])
```

**❌ DON'T:**
```typescript
// Jangan fetch semua data sekaligus
const allOrders = await prisma.order.findMany()  // Could be 10,000+ rows!

// Jangan query di loop
for (const order of orders) {
  const bowl = await prisma.bowl.findUnique(...)  // N+1 query problem
}
```

---

## Testing

### Unit Testing (tRPC Procedures)

```bash
# Install Vitest
npm install -D vitest @vitest/ui
```

**Example test:**
```typescript
// src/server/routers/__tests__/orders.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { appRouter } from '../_app'
import { prisma } from '@/lib/prisma'

describe('orders.create', () => {
  beforeEach(async () => {
    await prisma.order.deleteMany()
    await prisma.bowl.upsert({
      where: { id: 'bowl-test' },
      create: { id: 'bowl-test', isActive: false },
      update: { isActive: false }
    })
  })

  it('should create order successfully', async () => {
    const caller = appRouter.createCaller({
      userId: null,
      role: null
    })
    
    const result = await caller.orders.create({
      bowl_id: 'bowl-test',
      customer_name: 'Test User',
      preferences: {
        broth: 'kuah',
        spicy_level: 3,
        taste: 'normal'
      }
    })

    expect(result.order).toBeDefined()
    expect(result.order.customerName).toBe('Test User')
  })

  it('should throw error if bowl is active', async () => {
    await prisma.bowl.update({
      where: { id: 'bowl-test' },
      data: { isActive: true }
    })

    const caller = appRouter.createCaller({
      userId: null,
      role: null
    })
    
    await expect(
      caller.orders.create({
        bowl_id: 'bowl-test',
        customer_name: 'Test',
        preferences: { broth: 'kuah', spicy_level: 3, taste: 'normal' }
      })
    ).rejects.toThrow('Wadah sedang digunakan')
  })
})
```

Run tests:
```bash
npm run test
```

---

### Integration Testing (Playwright)

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install
```

**Example test:**
```typescript
// tests/order-flow.spec.ts
import { test, expect } from '@playwright/test'

test('complete order flow', async ({ page }) => {
  // 1. Pelanggan scan QR
  await page.goto('/order/bowl-A1')
  
  // 2. Isi form
  await page.fill('input[name="customer_name"]', 'Test User')
  await page.click('button:has-text("Pesan Sekarang")')
  
  // 3. Verify redirect ke tracking
  await expect(page).toHaveURL(/\/order\/track\//)
  
  // 4. Verify waiting state
  await expect(page.locator('text=Menunggu kasir')).toBeVisible()
})
```

Run tests:
```bash
npx playwright test
```

---

## Debugging

### Prisma Queries

Enable query logging di development:

```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],  // Enable logging
})
```

Kamu akan lihat semua SQL queries di terminal.

---

### tRPC Requests

Install tRPC DevTools:

```bash
npm install @trpc/devtools
```

```typescript
// src/lib/trpc/Provider.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function TRPCProvider({ children }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

Open DevTools: klik icon di bottom-right browser.

---

### Supabase Realtime

Debug realtime di browser console:

```typescript
const channel = supabase
  .channel('debug')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders'
  }, (payload) => {
    console.log('Realtime update:', payload)  // Debug log
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)  // Check connection
  })
```

---

### Common Issues

**Issue: "Prisma Client not found"**

Solution:
```bash
npx prisma generate
```

---

**Issue: "tRPC error: Cannot read properties of undefined"**

Solution: Check context creation di `src/server/context.ts`. Pastikan semua properties ada.

---

**Issue: "Supabase Realtime tidak update"**

Solution:
1. Check replication enabled di Supabase dashboard
2. Verify anon key di `.env.local`
3. Check browser console untuk WebSocket errors

---

## Git Workflow

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add order tracking page
fix: resolve bowl reset issue
docs: update API documentation
style: format code with prettier
refactor: extract useOrderRealtime hook
test: add orders.create unit tests
chore: update dependencies
```

---

### Branch Strategy

```
main          → Production-ready code
develop       → Integration branch
feature/*     → New features
fix/*         → Bug fixes
hotfix/*      → Urgent production fixes
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Create + run migration |
| `npx prisma db seed` | Seed database |
| `npm run test` | Run unit tests |
| `npx playwright test` | Run E2E tests |

---

## Helpful Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)

### Tools

- [Prisma Studio](https://www.prisma.io/studio) — Visual database editor
- [tRPC Panel](https://github.com/iway1/trpc-panel) — tRPC API explorer
- [React Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools) — Debug queries

---

**Happy coding! 🚀**
