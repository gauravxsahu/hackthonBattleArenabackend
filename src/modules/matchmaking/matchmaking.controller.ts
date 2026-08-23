import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { matchmakingService } from "./matchmaking.service";
import { prisma } from "../../config/prisma";
import { parseQueueableMode } from "./matchmaking.validation";

export const matchmakingController = {
  join: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const mode = parseQueueableMode(req.body?.mode ?? req.query?.mode);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const status = await matchmakingService.join(req.user!.id, user.rating, mode);
    sendSuccess(res, status, 201);
  }),

  leave: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const mode = parseQueueableMode(req.body?.mode ?? req.query?.mode);
    const status = await matchmakingService.leave(req.user!.id, mode);
    sendSuccess(res, status);
  }),

  status: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const mode = parseQueueableMode(req.query?.mode);
    const status = await matchmakingService.status(req.user!.id, mode);
    sendSuccess(res, status);
  }),
};
