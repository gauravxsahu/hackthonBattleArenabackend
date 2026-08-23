import { Router } from "express";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.validation";
import { validateBody } from "../../utils/validation/common";
import { requireAuth } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/security";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authRateLimiter, authController.refresh);
router.get("/me", requireAuth, authController.me);

export default router;
