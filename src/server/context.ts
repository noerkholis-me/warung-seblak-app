import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const { userId, sessionClaims } = await auth();

  return {
    prisma,
    userId,
    role: sessionClaims?.metadata?.role as
      | "admin"
      | "kasir"
      | "dapur"
      | undefined,
    ...opts,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
