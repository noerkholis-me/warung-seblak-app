"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { Preferences } from "../schemas/order.schema";

interface Order {
  id: string;
  customerName: string;
  preferences: Preferences;
  totalPrice: number | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

export function useOrderRealtime(orderId: string, initialOrder: Order) {
  const [order, setOrder] = useState<Order>(initialOrder);

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          setOrder({
            id: raw.id as string,
            customerName: raw.customer_name as string,
            preferences: raw.preferences as Preferences,
            totalPrice: raw.total_price as number | null,
            paymentStatus: raw.payment_status as PaymentStatus,
            status: raw.status as OrderStatus,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return order;
}
