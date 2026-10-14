import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { logger } from "../shared/logger/logger.ts";
import { env } from "../shared/env.ts";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export async function connectDatabase() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info("PostgreSQL connected");
  } catch (err) {
    logger.error("PostgreSQL connection failed", err);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
}
