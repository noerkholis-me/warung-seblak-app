import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from "@/generated/prisma/enums";

export const paymentsRouter = router({
  confirmCash: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new Error("Order tidak ditemukan");
      }

      if (!order.totalPrice) {
        throw new Error("Harga belum diinput kasir");
      }

      if (order.paymentStatus === PaymentStatus.paid) {
        throw new Error("Order sudah dibayar");
      }

      const [payment] = await ctx.prisma.$transaction([
        ctx.prisma.payment.create({
          data: {
            orderId: input.orderId,
            amount: order.totalPrice,
            paymentMethod: PaymentMethod.cash,
          },
        }),
        ctx.prisma.order.update({
          where: { id: input.orderId },
          data: {
            paymentStatus: PaymentStatus.paid,
            paymentMethod: PaymentMethod.cash,
            status: OrderStatus.completed,
          },
        }),
      ]);

      return { payment };
    }),
});
