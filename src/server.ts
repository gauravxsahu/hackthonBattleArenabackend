import { createServer } from "http";
import { createApp } from "./app";
import { initSocketServer } from "./sockets";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { logger } from "./utils/logger";

const SKILLS: { name: string; category: string }[] = [
  { name: "React", category: "frontend" },
  { name: "Vue", category: "frontend" },
  { name: "Node.js", category: "backend" },
  { name: "Express", category: "backend" },
  { name: "PostgreSQL", category: "backend" },
  { name: "Python", category: "ai" },
  { name: "TensorFlow", category: "ai" },
  { name: "Docker", category: "devops" },
  { name: "Kubernetes", category: "devops" },
  { name: "AWS", category: "devops" },
  { name: "Swift", category: "mobile" },
  { name: "Flutter", category: "mobile" },
  { name: "Figma", category: "design" },
  { name: "TypeScript", category: "backend" },
  { name: "GraphQL", category: "backend" },
];

const BADGES: { code: string; name: string; description: string }[] = [
  { code: "FIRST_WIN", name: "First Win", description: "Won your first hackathon battle." },
  { code: "FIVE_WINS", name: "Five-Time Champion", description: "Won five hackathon battles." },
  { code: "WIN_STREAK", name: "On Fire", description: "Won three games in a row." },
  { code: "SPEED_CODER", name: "Speed Coder", description: "Submitted with time to spare." },
  { code: "AI_MASTER", name: "AI Master", description: "Built an outstanding AI-powered feature." },
  { code: "TEAM_PLAYER", name: "Team Player", description: "Consistently high team collaboration." },
  { code: "HACKATHON_CHAMPION", name: "Hackathon Champion", description: "Reached double-digit wins." },
];

/**
 * Render's free tier has no shell/SSH access, so `bunx prisma db seed`
 * can't be run manually against production. Auto-seed the skills catalog
 * and badge catalog on every boot instead — upsert-based, so it's a
 * no-op once the data already exists and safe to run on every restart.
 */
async function seedCatalogIfEmpty() {
  try {
    const skillCount = await prisma.skill.count();
    if (skillCount === 0) {
      logger.info("Skill catalog empty — seeding skills");
      await Promise.all(SKILLS.map((s) => prisma.skill.upsert({ where: { name: s.name }, create: s, update: {} })));
    }

    const badgeCount = await prisma.badge.count();
    if (badgeCount === 0) {
      logger.info("Badge catalog empty — seeding badges");
      await Promise.all(
        BADGES.map((b) => prisma.badge.upsert({ where: { code: b.code as never }, create: b as never, update: {} }))
      );
    }
  } catch (err) {
    // Don't block server startup if catalog seeding fails — log and move on.
    logger.error("Catalog auto-seed failed", { err });
  }
}

const app = createApp();
const httpServer = createServer(app);
initSocketServer(httpServer);

seedCatalogIfEmpty().finally(() => {
  httpServer.listen(env.port, () => {
    logger.info(`Hackathon Battle Arena backend listening on :${env.port}`, { env: env.nodeEnv });
  });
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  httpServer.close();
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));