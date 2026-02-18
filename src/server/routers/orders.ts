import { z } from "zod";
import {
  router,
  publicProcedure,
  kasirProcedure,
  dapurProcedure,
} from "../trpc";
import { createOrderSchema } from "@/features/order/schemas/order.schema";
import { OrderStatus } from "@/generated/prisma/enums";

export const ordersRouter = router({
  create: publicProcedure
    .input(createOrderSchema)
    .output(z.object({ order: z.object({ id: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      const { bowlId, customerName, preferences } = input;

      const bowl = await ctx.prisma.bowl.findUnique({
        where: { id: bowlId },
      });

      if (!bowl) {
        throw new Error("Wadah tidak ditemukan");
      }

      if (bowl.isActive) {
        throw new Error("Wadah sedang digunakan");
      }

      const order = await ctx.prisma.$transaction(async (tx) => {
        await tx.bowl.update({
          where: { id: bowlId },
          data: { isActive: true },
        });

        return tx.order.create({
          data: {
            bowlId: bowlId,
            customerName: customerName,
            preferences: preferences,
          },
        });
      });

      return { order };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new Error("Pesanan tidak ditemukan");
      }

      return { order };
    }),

  updatePrice: kasirProcedure
    .input(
      z.object({
        orderId: z.string(),
        totalPrice: z.number().min(1000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new Error("Order tidak ditemukan");
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        await tx.bowl.update({
          where: { id: order.bowlId },
          data: { isActive: false },
        });

        return tx.order.update({
          where: { id: input.orderId },
          data: {
            totalPrice: input.totalPrice,
            status: OrderStatus.confirmed,
          },
        });
      });

      return { order: updated };
    }),

  updateStatus: kasirProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.enum(OrderStatus),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      });

      return { order };
    }),

  listActive: kasirProcedure.query(async ({ ctx }) => {
    console.log(ctx.role);

    const orders = await ctx.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.waiting,
            OrderStatus.confirmed,
            OrderStatus.preparing,
            OrderStatus.served,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { orders };
  }),

  listActiveDapur: dapurProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.confirmed, OrderStatus.preparing],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { orders };
  }),

  updateStatusDapur: dapurProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.enum(OrderStatus),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      });

      return { order };
    }),
});
