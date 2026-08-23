import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateParams } from "../../utils/validation/common";
import { validateUuid } from "../../utils/validation/validators";
import { gameController } from "./game.controller";
import submissionRoutes from "../submissions/submission.routes";
import { rewardsController } from "../rewards/rewards.controller";

const router = Router();
const gameIdParamSchema = { gameId: (v: unknown) => validateUuid(v, "gameId") };

router.get("/", requireAuth, gameController.listMine);
router.get("/:gameId", requireAuth, validateParams(gameIdParamSchema), gameController.getGame);
router.post("/:gameId/ready", requireAuth, validateParams(gameIdParamSchema), gameController.ready);
router.get("/:gameId/players", requireAuth, validateParams(gameIdParamSchema), gameController.players);
router.get("/:gameId/messages", requireAuth, validateParams(gameIdParamSchema), gameController.messages);
router.get("/:gameId/rewards/me", requireAuth, validateParams(gameIdParamSchema), rewardsController.getMyGameReward);
router.get("/:gameId/result", requireAuth, validateParams(gameIdParamSchema), gameController.result);
router.use("/:gameId/submissions", validateParams(gameIdParamSchema), submissionRoutes);

export default router;
