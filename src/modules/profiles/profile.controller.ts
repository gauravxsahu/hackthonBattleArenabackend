import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { profileService } from "./profile.service";

export const profileController = {
  getMyProfile: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const profile = await profileService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  }),

  updateMyProfile: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const profile = await profileService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, profile);
  }),
};
