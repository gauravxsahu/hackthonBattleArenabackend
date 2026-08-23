import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { skillService } from "./skill.service";

export const skillController = {
  listSkills: asyncHandler(async (_req, res) => {
    const skills = await skillService.listSkills();
    sendSuccess(res, skills);
  }),

  listMySkills: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const skills = await skillService.listUserSkills(req.user!.id);
    sendSuccess(res, skills);
  }),

  addSkill: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await skillService.addOrUpdateUserSkill(req.user!.id, req.body);
    sendSuccess(res, result, 201);
  }),

  updateSkill: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await skillService.updateUserSkill(req.user!.id, req.params.skillId, req.body.proficiency);
    sendSuccess(res, result);
  }),

  removeSkill: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await skillService.removeUserSkill(req.user!.id, req.params.skillId);
    sendSuccess(res, { removed: true });
  }),
};
