import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for Next.js (prevents too many connections in dev)
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prismaClient: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prismaClient;
}

/**
 * Canonical Prisma client export.
 */
export const prisma = prismaClient;

/**
 * Compatibility alias to avoid breakage in files that import `db`.
 */
export const db = prismaClient;