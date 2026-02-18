import { Preferences } from "@/features/order/schemas/order.schema";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const bowlsRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const bowl = await ctx.prisma.bowl.findUnique({
        where: { id: input.id },
      });

      if (!bowl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wadah tidak ditemukan",
        });
      }

      return bowl;
    }),

  getActiveOrder: publicProcedure
    .input(z.object({ bowlId: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findFirst({
        where: {
          bowlId: input.bowlId,
          status: { in: ["waiting", "confirmed", "preparing", "served"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!order) {
        return { order: null };
      }

      return {
        order: {
          ...order,
          preferences: order.preferences as Preferences,
        },
      };
    }),
});
