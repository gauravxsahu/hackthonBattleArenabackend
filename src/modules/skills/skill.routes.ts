import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../utils/validation/common";
import { skillController } from "./skill.controller";
import { addUserSkillSchema, skillIdParamSchema, updateUserSkillSchema } from "./skill.validation";

// Mounted at /api/skills for the catalog, and re-exported pieces are wired
// into /api/profile/skills in modules/profiles for the per-user routes
// (kept together here since they share validation/service).
const catalogRouter = Router();
catalogRouter.get("/", skillController.listSkills);

const profileSkillsRouter = Router();
profileSkillsRouter.get("/", requireAuth, skillController.listMySkills);
profileSkillsRouter.post("/", requireAuth, validateBody(addUserSkillSchema), skillController.addSkill);
profileSkillsRouter.put(
  "/:skillId",
  requireAuth,
  validateParams(skillIdParamSchema),
  validateBody(updateUserSkillSchema),
  skillController.updateSkill
);
profileSkillsRouter.delete("/:skillId", requireAuth, validateParams(skillIdParamSchema), skillController.removeSkill);

export { catalogRouter as skillCatalogRoutes, profileSkillsRouter as profileSkillsRoutes };
