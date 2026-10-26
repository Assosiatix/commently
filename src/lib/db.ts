import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const g = globalThis as unknown as { __prisma?: PrismaClient };

function make() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = g.__prisma ?? make();
if (process.env.NODE_ENV !== "production") g.__prisma = db;
