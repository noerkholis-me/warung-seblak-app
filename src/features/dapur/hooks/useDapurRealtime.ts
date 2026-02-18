"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OrderStatus } from "@/generated/prisma/enums";
import type { DapurOrder } from "@/lib/types/dapur.types";

export function useDapurRealtime(initialOrders: DapurOrder[]) {
  const [orders, setOrders] = useState<DapurOrder[]>(initialOrders);

  useEffect(() => {
    const channel = supabase
      .channel("dapur-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;

          // Hanya tambahkan jika status confirmed
          if (raw.status === OrderStatus.confirmed) {
            const newOrder: DapurOrder = {
              id: raw.id as string,
              customerName: raw.customer_name as string,
              preferences: raw.preferences as DapurOrder["preferences"],
              status: raw.status as OrderStatus,
              createdAt: raw.created_at as string,
            };
            setOrders((prev) => [...prev, newOrder]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const orderId = raw.id as string;
          const newStatus = raw.status as OrderStatus;

          setOrders((prev) => {
            // Jika status berubah jadi confirmed, tambahkan ke list
            if (newStatus === OrderStatus.confirmed) {
              const exists = prev.find((o) => o.id === orderId);
              if (!exists) {
                return [
                  ...prev,
                  {
                    id: orderId,
                    customerName: raw.customer_name as string,
                    preferences: raw.preferences as DapurOrder["preferences"],
                    status: newStatus,
                    createdAt: raw.created_at as string,
                  },
                ];
              }
            }

            // Jika status berubah jadi served atau completed, remove dari list
            if (
              newStatus === OrderStatus.served ||
              newStatus === OrderStatus.completed
            ) {
              return prev.filter((o) => o.id !== orderId);
            }

            // Update status jika masih di list
            return prev.map((o) =>
              o.id === orderId ? { ...o, status: newStatus } : o,
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, setOrders };
}
