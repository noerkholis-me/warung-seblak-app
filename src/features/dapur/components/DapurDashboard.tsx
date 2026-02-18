"use client";

import { useState } from "react";
import { useDapurRealtime } from "@/features/dapur/hooks/useDapurRealtime";
import { OrderQueueCard } from "./OrderQueueCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { OrderStatus } from "@/generated/prisma/enums";
import type { DapurOrder } from "@/lib/types/dapur.types";

interface DapurDashboardProps {
  initialOrders: DapurOrder[];
}

export function DapurDashboard({ initialOrders }: DapurDashboardProps) {
  const { orders, setOrders } = useDapurRealtime(initialOrders);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: (data) => {
      // Update local state
      setOrders((prev) => {
        // Remove dari list jika sudah served
        if (data.order.status === OrderStatus.served) {
          return prev.filter((o) => o.id !== data.order.id);
        }
        // Update status
        return prev.map((o) =>
          o.id === data.order.id ? { ...o, status: data.order.status } : o,
        );
      });
      setLoadingOrderId(null);
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      setLoadingOrderId(null);
    },
  });

  const handleStartCooking = (orderId: string) => {
    setLoadingOrderId(orderId);
    updateStatus.mutate({
      orderId,
      status: OrderStatus.preparing,
    });
  };

  const handleMarkServed = (orderId: string) => {
    setLoadingOrderId(orderId);
    updateStatus.mutate({
      orderId,
      status: OrderStatus.served,
    });
  };

  const confirmedOrders = orders.filter(
    (o) => o.status === OrderStatus.confirmed,
  );
  const preparingOrders = orders.filter(
    (o) => o.status === OrderStatus.preparing,
  );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🍳 Dashboard Dapur</h1>
          <p className="text-sm text-muted-foreground">
            Antrian pesanan realtime
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-base px-4 py-2">
            {confirmedOrders.length} Baru
          </Badge>
          <Badge variant="default" className="text-base px-4 py-2">
            {preparingOrders.length} Dimasak
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">😴</p>
          <p className="text-lg font-medium">Tidak ada pesanan</p>
          <p className="text-sm text-muted-foreground">
            Pesanan baru akan muncul secara otomatis
          </p>
        </div>
      )}

      {/* Pesanan Baru (Confirmed) */}
      {confirmedOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Pesanan Baru ({confirmedOrders.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {confirmedOrders.map((order) => (
              <OrderQueueCard
                key={order.id}
                order={order}
                onStartCooking={handleStartCooking}
                onMarkServed={handleMarkServed}
                isLoading={loadingOrderId === order.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sedang Dimasak (Preparing) */}
      {preparingOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Sedang Dimasak ({preparingOrders.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {preparingOrders.map((order) => (
              <OrderQueueCard
                key={order.id}
                order={order}
                onStartCooking={handleStartCooking}
                onMarkServed={handleMarkServed}
                isLoading={loadingOrderId === order.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
