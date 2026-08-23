import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { matchmakingController } from "./matchmaking.controller";

const router = Router();

router.post("/join", requireAuth, matchmakingController.join);
router.post("/leave", requireAuth, matchmakingController.leave);
router.get("/status", requireAuth, matchmakingController.status);

export default router;
