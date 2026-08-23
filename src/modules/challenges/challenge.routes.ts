import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../utils/validation/common";
import { challengeController } from "./challenge.controller";
import { generateChallengeSchema } from "./challenge.validation";

const router = Router();

// Challenge generation is normally triggered internally by the game
// service once a match's teams are formed, but is also exposed to admins
// for manual testing / preview.
router.post("/generate", requireAuth, requireRole("ADMIN"), validateBody(generateChallengeSchema), challengeController.generate);
router.get("/:challengeId", requireAuth, challengeController.getById);

export default router;
