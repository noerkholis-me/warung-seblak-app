import { router } from "../trpc";
import { ordersRouter } from "./orders";
import { paymentsRouter } from "./payments";
import { bowlsRouter } from "./bowls";

export const appRouter = router({
  orders: ordersRouter,
  payments: paymentsRouter,
  bowls: bowlsRouter,
});

export type AppRouter = typeof appRouter;
