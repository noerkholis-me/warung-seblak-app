import prisma from "@/lib/prisma";
import { KasirDashboard } from "@/features/kasir/components/KasirDashboard";
import type { KasirOrder } from "@/features/kasir/hooks/useKasirRealtime";
import { OrderStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function KasirPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: [
          OrderStatus.waiting,
          OrderStatus.confirmed,
          OrderStatus.preparing,
          OrderStatus.served,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const initialOrders: KasirOrder[] = orders.map((o) => ({
    id: o.id,
    bowlId: o.bowlId,
    customerName: o.customerName,
    preferences: o.preferences as KasirOrder["preferences"],
    totalPrice: o.totalPrice,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return <KasirDashboard initialOrders={initialOrders} />;
}
