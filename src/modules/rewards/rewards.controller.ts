import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { rewardsRepository } from "./rewards.repository";

export const rewardsController = {
  getMyGameReward: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const reward = await rewardsRepository.getGameRewardForUser(req.params.gameId, req.user!.id);
    sendSuccess(res, reward);
  }),
};
