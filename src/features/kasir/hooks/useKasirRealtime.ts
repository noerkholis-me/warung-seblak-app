"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Preferences } from "@/features/order/schemas/order.schema";
import { trpc } from "@/lib/trpc/client";
import type { OrderView } from "@/lib/types/order.types";
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from "@/generated/prisma/enums";

export type KasirOrder = OrderView;

export function useKasirRealtime(initialOrders: KasirOrder[]) {
  const [orders, setOrders] = useState<KasirOrder[]>(initialOrders);

  const updatePriceMutation = trpc.orders.updatePrice.useMutation();
  const confirmCashMutation = trpc.payments.confirmCash.useMutation();

  const updatePrice = async (orderId: string, price: number) => {
    const data = await updatePriceMutation.mutateAsync({
      orderId,
      totalPrice: price,
    });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === data.order.id
          ? {
              ...o,
              totalPrice: data.order.totalPrice,
              status: data.order.status,
            }
          : o,
      ),
    );
    return data;
  };

  const confirmCash = async (orderId: string) => {
    const data = await confirmCashMutation.mutateAsync({ orderId });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: PaymentStatus.paid,
              paymentMethod: PaymentMethod.cash,
              status: OrderStatus.completed,
            }
          : o,
      ),
    );
    return data;
  };

  useEffect(() => {
    const channel = supabase
      .channel("kasir-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const newOrder: KasirOrder = {
            id: raw.id as string,
            bowlId: raw.bowl_id as string,
            customerName: raw.customer_name as string,
            preferences: raw.preferences as Preferences,
            totalPrice: raw.total_price as number | null,
            paymentStatus: raw.payment_status as PaymentStatus,
            paymentMethod: raw.payment_method as PaymentMethod | null,
            status: raw.status as OrderStatus,
            createdAt: raw.created_at as string,
          };
          setOrders((prev) => [newOrder, ...prev]);
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
          setOrders((prev) =>
            prev.map((o) =>
              o.id === raw.id
                ? {
                    ...o,
                    totalPrice: raw.total_price as number | null,
                    paymentStatus: raw.payment_status as PaymentStatus,
                    paymentMethod: raw.payment_method as PaymentMethod | null,
                    status: raw.status as OrderStatus,
                  }
                : o,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, setOrders, updatePrice, confirmCash };
}
