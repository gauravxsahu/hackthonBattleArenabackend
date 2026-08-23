import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import { challengeService } from "./challenge.service";

export const challengeController = {
  generate: asyncHandler(async (req, res) => {
    const challenge = await challengeService.generateAndStore(req.body);
    sendSuccess(res, challenge, 201);
  }),

  getById: asyncHandler(async (req, res) => {
    const challenge = await challengeService.getById(req.params.challengeId);
    sendSuccess(res, challenge);
  }),
};
