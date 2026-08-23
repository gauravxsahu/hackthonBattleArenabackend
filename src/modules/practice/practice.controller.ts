import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { practiceService } from "./practice.service";

export const practiceController = {
  start: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const game = await practiceService.start(req.user!.id);
    sendSuccess(res, game, 201);
  }),
};
