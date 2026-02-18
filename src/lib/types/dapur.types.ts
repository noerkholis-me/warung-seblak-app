import { OrderStatus } from "@/generated/prisma/enums";
import type { Preferences } from "@/features/order/schemas/order.schema";

export interface DapurOrder {
  id: string;
  customerName: string;
  preferences: Preferences;
  status: OrderStatus;
  createdAt: string;
}
