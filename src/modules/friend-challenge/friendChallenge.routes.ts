import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../utils/validation/common";
import { friendChallengeController } from "./friendChallenge.controller";
import { joinFriendChallengeSchema } from "./friendChallenge.validation";

const router = Router();

router.post("/create", requireAuth, friendChallengeController.create);
router.post("/join", requireAuth, validateBody(joinFriendChallengeSchema), friendChallengeController.join);

export default router;
