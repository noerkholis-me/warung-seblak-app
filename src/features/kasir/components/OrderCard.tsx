"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { KasirOrder } from "@/features/kasir/hooks/useKasirRealtime";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

const statusLabel: Record<OrderStatus, string> = {
  [OrderStatus.waiting]: "Menunggu",
  [OrderStatus.confirmed]: "Dikonfirmasi",
  [OrderStatus.preparing]: "Dimasak",
  [OrderStatus.served]: "Disajikan",
  [OrderStatus.completed]: "Selesai",
};

const statusVariant: Record<OrderStatus, "secondary" | "default" | "outline"> =
  {
    [OrderStatus.waiting]: "secondary",
    [OrderStatus.confirmed]: "default",
    [OrderStatus.preparing]: "default",
    [OrderStatus.served]: "default",
    [OrderStatus.completed]: "outline",
  };

interface OrderCardProps {
  order: KasirOrder;
  onPriceSubmit: (orderId: string, price: number) => Promise<void>;
  onCashConfirm: (orderId: string) => Promise<void>;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

export function OrderCard({
  order,
  onPriceSubmit,
  onCashConfirm,
}: OrderCardProps) {
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePriceSubmit = async () => {
    const parsed = parseInt(price.replace(/\D/g, ""));
    if (!parsed || parsed < 1000) return;

    setIsLoading(true);
    await onPriceSubmit(order.id, parsed);
    setIsLoading(false);
  };

  const handleCashConfirm = async () => {
    setIsLoading(true);
    await onCashConfirm(order.id);
    setIsLoading(false);
  };

  return (
    <Card
      className={order.paymentStatus === PaymentStatus.paid ? "opacity-60" : ""}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">{order.customerName}</p>
            <p className="text-xs text-muted-foreground">{order.bowlId}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusVariant[order.status]}>
              {statusLabel[order.status]}
            </Badge>
            {order.paymentStatus === PaymentStatus.paid && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                LUNAS ✓
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Preferensi */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="capitalize text-xs">
            {order.preferences.broth}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Pedas {order.preferences.spicy_level}
          </Badge>
          <Badge variant="outline" className="capitalize text-xs">
            {order.preferences.taste}
          </Badge>
        </div>

        {order.preferences.extra_notes && (
          <p className="text-xs text-muted-foreground italic">
            &quot;{order.preferences.extra_notes}&quot;
          </p>
        )}

        <Separator />

        {/* Belum ada harga — tampilkan input */}
        {!order.totalPrice && (
          <div className="flex gap-2">
            <Input
              placeholder="Total harga (Rp)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min={0}
            />
            <Button
              onClick={handlePriceSubmit}
              disabled={isLoading || !price}
              size="sm"
            >
              Kirim
            </Button>
          </div>
        )}

        {/* Sudah ada harga */}
        {order.totalPrice && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold">
                {formatRupiah(order.totalPrice)}
              </span>
            </div>

            {/* Belum bayar — tampilkan konfirmasi cash */}
            {order.paymentStatus === PaymentStatus.pending && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCashConfirm}
                disabled={isLoading}
              >
                Konfirmasi Cash
              </Button>
            )}

            {/* Sudah bayar */}
            {order.paymentStatus === PaymentStatus.paid && (
              <p className="text-xs text-center text-muted-foreground">
                Dibayar via {order.paymentMethod?.toUpperCase()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
