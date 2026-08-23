import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { leaderboardService } from "./leaderboard.service";

export const leaderboardController = {
  top: asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await leaderboardService.getTop(limit);
    sendSuccess(res, rows);
  }),

  me: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const row = await leaderboardService.getMyRank(req.user!.id);
    sendSuccess(res, row);
  }),
};
