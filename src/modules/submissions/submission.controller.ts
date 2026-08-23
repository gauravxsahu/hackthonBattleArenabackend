import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { submissionService } from "./submission.service";

export const submissionController = {
  submit: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const submission = await submissionService.submit(req.params.gameId, req.user!.id, req.body);
    sendSuccess(res, submission, 201);
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const submissions = await submissionService.listForGame(req.params.gameId, req.user!.id);
    sendSuccess(res, submissions);
  }),
};
