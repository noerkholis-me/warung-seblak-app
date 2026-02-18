import prisma from "@/lib/prisma";
import { OrderTracking } from "@/features/order/components/OrderTracking";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function TrackOrderPage({ params }: Props) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-4xl">❓</p>
            <p className="font-semibold">Pesanan tidak ditemukan</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const initialOrder = {
    id: order.id,
    customerName: order.customerName,
    preferences: order.preferences as {
      broth: string;
      spicy_level: number;
      taste: string;
      extra_notes?: string;
    },
    totalPrice: order.totalPrice,
    paymentStatus: order.paymentStatus,
    status: order.status,
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <OrderTracking initialOrder={initialOrder} />
    </main>
  );
}
