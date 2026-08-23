import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { practiceController } from "./practice.controller";

const router = Router();

router.post("/start", requireAuth, practiceController.start);

export default router;
