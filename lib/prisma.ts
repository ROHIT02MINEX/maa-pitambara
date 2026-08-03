import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient is reused across hot reloads in development and across
 * warm lambda invocations in production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

globalForPrisma.prisma = prisma;

export default prisma;
