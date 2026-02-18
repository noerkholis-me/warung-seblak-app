import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { createOrderSchema } from "@/features/order/schemas/order.schema";

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

  updatePrice: publicProcedure
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
            status: "confirmed",
          },
        });
      });

      return { order: updated };
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.enum([
          "waiting",
          "confirmed",
          "preparing",
          "served",
          "completed",
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      });

      return { order };
    }),

  listActive: publicProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: {
        status: { in: ["waiting", "confirmed", "preparing", "served"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { orders };
  }),
});
