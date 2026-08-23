import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../utils/validation/common";
import { submissionController } from "./submission.controller";
import { createSubmissionSchema } from "./submission.validation";

// Mounted at /api/games/:gameId/submissions (see modules/games/game.routes.ts)
const router = Router({ mergeParams: true });

router.post("/", requireAuth, validateBody(createSubmissionSchema), submissionController.submit);
router.get("/", requireAuth, submissionController.list);

export default router;
