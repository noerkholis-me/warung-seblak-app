import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "prisma/config";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env("DATABASE_URL"),
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
    errorFormat: "pretty",
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
