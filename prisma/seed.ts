import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "prisma/config";

const adapter = new PrismaPg({
  connectionString: env("DATABASE_URL"),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const bowls = ["bowl-A1", "bowl-A2", "bowl-A3", "bowl-A4", "bowl-A5"];

  for (const id of bowls) {
    await prisma.bowl.upsert({
      where: { id },
      update: {},
      create: { id, isActive: false },
    });
  }

  console.log("✅ Seed berhasil — 5 bowl tersedia");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
