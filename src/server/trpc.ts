import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export const middleware = t.middleware;

const isAuthenticated = t.middleware(({ next, ctx }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      role: ctx.role,
    },
  });
});

const isKasir = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.role !== "kasir") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

const isDapur = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.role !== "dapur") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
export const kasirProcedure = protectedProcedure.use(isKasir);
export const dapurProcedure = protectedProcedure.use(isDapur);
