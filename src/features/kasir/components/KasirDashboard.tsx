"use client";

import { useState } from "react";
import {
  useKasirRealtime,
  KasirOrder,
} from "@/features/kasir/hooks/useKasirRealtime";
import { OrderCard } from "@/features/kasir/components/OrderCard";
import { BowlScanner } from "@/features/kasir/components/BowlScanner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

interface KasirDashboardProps {
  initialOrders: KasirOrder[];
}

type FilterStatus = "all" | OrderStatus;

export function KasirDashboard({ initialOrders }: KasirDashboardProps) {
  const { orders, updatePrice, confirmCash } = useKasirRealtime(initialOrders);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const handlePriceSubmit = async (orderId: string, price: number) => {
    await updatePrice(orderId, price);
  };

  const handleCashConfirm = async (orderId: string) => {
    await confirmCash(orderId);
  };

  const handleBowlFound = (_bowlId: string, order: { id: string } | null) => {
    if (!order) return;
    const el = document.getElementById(`order-${order.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "Semua", value: "all" },
    { label: "Menunggu", value: OrderStatus.waiting },
    { label: "Dikonfirmasi", value: OrderStatus.confirmed },
    { label: "Dimasak", value: OrderStatus.preparing },
    { label: "Disajikan", value: OrderStatus.served },
    { label: "Selesai", value: OrderStatus.completed },
  ];

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter(
    (o) => o.totalPrice && o.paymentStatus === PaymentStatus.pending,
  ).length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard Kasir</h1>
        {pendingCount > 0 && (
          <Badge variant="destructive">{pendingCount} belum bayar</Badge>
        )}
      </div>

      <BowlScanner onBowlFound={handleBowlFound} />

      <Separator />

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredOrders.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Tidak ada order
          </p>
        )}
        {filteredOrders.map((order) => (
          <div key={order.id} id={`order-${order.id}`}>
            <OrderCard
              order={order}
              onPriceSubmit={handlePriceSubmit}
              onCashConfirm={handleCashConfirm}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
