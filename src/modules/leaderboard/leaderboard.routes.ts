import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { leaderboardController } from "./leaderboard.controller";

const router = Router();

router.get("/", leaderboardController.top);
router.get("/me", requireAuth, leaderboardController.me);

export default router;
