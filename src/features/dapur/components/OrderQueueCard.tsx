"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/generated/prisma/enums";
import type { DapurOrder } from "@/lib/types/dapur.types";

interface OrderQueueCardProps {
  order: DapurOrder;
  onStartCooking: (orderId: string) => void;
  onMarkServed: (orderId: string) => void;
  isLoading?: boolean;
}

const statusLabel: Record<OrderStatus, string> = {
  [OrderStatus.waiting]: "Menunggu",
  [OrderStatus.confirmed]: "Baru Masuk",
  [OrderStatus.preparing]: "Sedang Dimasak",
  [OrderStatus.served]: "Siap",
  [OrderStatus.completed]: "Selesai",
};

const statusColor: Record<OrderStatus, string> = {
  [OrderStatus.waiting]: "bg-gray-500",
  [OrderStatus.confirmed]: "bg-blue-500",
  [OrderStatus.preparing]: "bg-orange-500",
  [OrderStatus.served]: "bg-green-500",
  [OrderStatus.completed]: "bg-gray-400",
};

export function OrderQueueCard({
  order,
  onStartCooking,
  onMarkServed,
  isLoading,
}: OrderQueueCardProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeSince = (isoString: string) => {
    const now = new Date();
    const created = new Date(isoString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins === 1) return "1 menit lalu";
    return `${diffMins} menit lalu`;
  };

  return (
    <Card className="relative">
      {/* Badge waktu di pojok kanan atas */}
      <div className="absolute top-4 right-4 text-xs text-muted-foreground">
        {formatTime(order.createdAt)}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold">{order.customerName}</h3>
            <p className="text-sm text-muted-foreground">
              {getTimeSince(order.createdAt)}
            </p>
          </div>
          <Badge className={statusColor[order.status]}>
            {statusLabel[order.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preferensi Rasa */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Preferensi Rasa
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-3 border rounded-lg">
              <span className="text-2xl mb-1">🌶️</span>
              <span className="text-lg font-bold">
                Level {order.preferences.spicy_level}
              </span>
              <span className="text-xs text-muted-foreground">Pedas</span>
            </div>

            <div className="flex flex-col items-center p-3 border rounded-lg">
              <span className="text-2xl mb-1">
                {order.preferences.broth === "kuah"
                  ? "🍲"
                  : order.preferences.broth === "nyemek"
                    ? "🥘"
                    : "🍜"}
              </span>
              <span className="text-lg font-bold capitalize">
                {order.preferences.broth}
              </span>
              <span className="text-xs text-muted-foreground">Jenis</span>
            </div>

            <div className="flex flex-col items-center p-3 border rounded-lg">
              <span className="text-2xl mb-1">
                {order.preferences.taste === "asin"
                  ? "🧂"
                  : order.preferences.taste === "manis"
                    ? "🍯"
                    : "⚖️"}
              </span>
              <span className="text-lg font-bold capitalize">
                {order.preferences.taste}
              </span>
              <span className="text-xs text-muted-foreground">Rasa</span>
            </div>
          </div>
        </div>

        {/* Catatan Tambahan */}
        {order.preferences.extra_notes && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium mb-1">⚠️ Catatan Khusus</p>
            <p className="text-sm italic">
              &quot;{order.preferences.extra_notes}&quot;
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {order.status === OrderStatus.confirmed && (
            <Button
              onClick={() => onStartCooking(order.id)}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              🍳 Mulai Masak
            </Button>
          )}

          {order.status === OrderStatus.preparing && (
            <Button
              onClick={() => onMarkServed(order.id)}
              disabled={isLoading}
              className="flex-1"
              size="lg"
              variant="default"
            >
              ✓ Siap Diantar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
