import { publicProcedure, router } from "../trpc";
import { z } from "zod";

export const bowlsRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) => {
      const bowl = ctx.prisma.bowl.findUnique({
        where: { id: input.id },
      });

      if (!bowl) {
        throw new Error("Wadah tidak ditemukan");
      }

      return bowl;
    }),

  getActiveOrder: publicProcedure
    .input(z.object({ bowlId: z.string() }))
    .query(({ input, ctx }) => {
      const order = ctx.prisma.order.findFirst({
        where: {
          bowlId: input.bowlId,
          status: { in: ["waiting", "confirmed", "preparing", "served"] },
        },
        orderBy: { createdAt: "desc" },
      });

      return order;
    }),
});
