import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateParams } from "../../utils/validation/common";
import { validateUuid } from "../../utils/validation/validators";
import { userController } from "./user.controller";

const router = Router();

// Must come before /:userId — otherwise "search" would be captured by the
// :userId param and rejected by the UUID validator instead of matching here.
router.get("/search", requireAuth, userController.search);

router.get(
  "/:userId",
  requireAuth,
  validateParams({ userId: (v) => validateUuid(v, "userId") }),
  userController.getPublicProfile
);

export default router;
