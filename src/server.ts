import { createServer } from "http";
import { createApp } from "./app";
import { initSocketServer } from "./sockets";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { logger } from "./utils/logger";

const app = createApp();
const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`Hackathon Battle Arena backend listening on :${env.port}`, { env: env.nodeEnv });
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  httpServer.close();
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
