import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { friendChallengeService } from "./friendChallenge.service";

export const friendChallengeController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const invite = await friendChallengeService.create(req.user!.id);
    sendSuccess(res, invite, 201);
  }),

  join: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const game = await friendChallengeService.join(req.user!.id, req.body.code);
    sendSuccess(res, game, 201);
  }),
};
