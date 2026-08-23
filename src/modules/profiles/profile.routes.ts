import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../utils/validation/common";
import { profileController } from "./profile.controller";
import { updateProfileSchema } from "./profile.validation";

const router = Router();

// Note: only the authenticated user's own profile is ever mutated here —
// there is no :userId param, so a player can never modify another
// player's profile (see tests/profile.test.ts).
router.get("/", requireAuth, profileController.getMyProfile);
router.put("/", requireAuth, validateBody(updateProfileSchema), profileController.updateMyProfile);

export default router;
