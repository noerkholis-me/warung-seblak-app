"use client";

import { useOrderRealtime } from "@/features/order/hooks/useOrderRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { Preferences } from "../schemas/order.schema";

const statusLabel: Record<OrderStatus, string> = {
  [OrderStatus.waiting]: "Menunggu kasir",
  [OrderStatus.confirmed]: "Sedang diproses",
  [OrderStatus.preparing]: "Sedang dimasak 🍳",
  [OrderStatus.served]: "Siap disajikan ✓",
  [OrderStatus.completed]: "Selesai ✓",
};

const statusColor: Record<OrderStatus, string> = {
  [OrderStatus.waiting]: "secondary",
  [OrderStatus.confirmed]: "default",
  [OrderStatus.preparing]: "default",
  [OrderStatus.served]: "default",
  [OrderStatus.completed]: "default",
};

interface Order {
  id: string;
  customerName: string;
  preferences: Preferences;
  totalPrice: number | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

interface OrderTrackingProps {
  initialOrder: Order;
}

export function OrderTracking({ initialOrder }: OrderTrackingProps) {
  const order = useOrderRealtime(initialOrder.id, initialOrder);

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl">🍜 Pesanan Kamu</CardTitle>
        <p className="text-center font-semibold">{order.customerName}</p>
        <div className="flex justify-center">
          <Badge variant={statusColor[order.status] as "default" | "secondary"}>
            {statusLabel[order.status] ?? order.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preferensi */}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-muted-foreground">Preferensi rasa</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {order.preferences.broth}
            </Badge>
            <Badge variant="outline">
              Pedas level {order.preferences.spicy_level}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.preferences.taste}
            </Badge>
          </div>
          {order.preferences.extra_notes && (
            <p className="text-muted-foreground italic">
              &quot;{order.preferences.extra_notes}&quot;
            </p>
          )}
        </div>

        <Separator />

        {/* Belum ada harga */}
        {!order.totalPrice && (
          <div className="text-center space-y-2 py-4">
            <div className="animate-pulse text-3xl">⏳</div>
            <p className="text-sm text-muted-foreground">
              Menunggu kasir memproses pesananmu...
            </p>
          </div>
        )}

        {/* Harga sudah masuk */}
        {order.totalPrice && order.paymentStatus === PaymentStatus.pending && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total pembayaran</p>
              <p className="text-3xl font-bold text-primary">
                {formatRupiah(order.totalPrice)}
              </p>
            </div>
            <Button className="w-full" size="lg">
              Bayar dengan QRIS
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              atau bayar cash langsung ke kasir
            </p>
          </div>
        )}

        {/* Sudah bayar */}
        {order.paymentStatus === PaymentStatus.paid && (
          <div className="text-center space-y-2 py-4">
            <p className="text-4xl">✅</p>
            <p className="font-semibold">Pembayaran berhasil!</p>
            <p className="text-sm text-muted-foreground">
              Selamat menikmati seblakmu 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
