import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Reuse a single PrismaClient instance across the process (important with
// `bun --watch`, which would otherwise create a new pool on every reload).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error", "warn"] : ["error", "warn"],
  });

if (!env.isProduction) {
  global.__prisma = prisma;
}
