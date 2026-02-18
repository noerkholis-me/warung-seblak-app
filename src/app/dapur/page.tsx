import { DapurDashboard } from "@/features/dapur/components/DapurDashboard";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/enums";
import type { DapurOrder } from "@/lib/types/dapur.types";

export const dynamic = "force-dynamic";

export default async function DapurPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: [OrderStatus.confirmed, OrderStatus.preparing],
      },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const initialOrders: DapurOrder[] = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    preferences: o.preferences as DapurOrder["preferences"],
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return <DapurDashboard initialOrders={initialOrders} />;
}
