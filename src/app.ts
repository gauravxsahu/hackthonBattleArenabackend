import express from "express";
import cookieParser from "cookie-parser";
import { corsMiddleware, helmetMiddleware, apiRateLimiter } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import profileRoutes from "./modules/profiles/profile.routes";
import { skillCatalogRoutes, profileSkillsRoutes } from "./modules/skills/skill.routes";
import matchmakingRoutes from "./modules/matchmaking/matchmaking.routes";
import gameRoutes from "./modules/games/game.routes";
import challengeRoutes from "./modules/challenges/challenge.routes";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes";
import userRoutes from "./modules/users/user.routes";
import practiceRoutes from "./modules/practice/practice.routes";
import friendChallengeRoutes from "./modules/friend-challenge/friendChallenge.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

  app.use("/api/auth", authRoutes);
  app.use("/api/profile/skills", profileSkillsRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/skills", skillCatalogRoutes);
  app.use("/api/matchmaking", matchmakingRoutes);
  app.use("/api/games", gameRoutes);
  app.use("/api/challenges", challengeRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/practice", practiceRoutes);
  app.use("/api/friend-challenge", friendChallengeRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
