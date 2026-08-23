import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import { userService } from "./user.service";

export const userController = {
  search: asyncHandler(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const results = await userService.search(query);
    sendSuccess(res, results);
  }),

  getPublicProfile: asyncHandler(async (req, res) => {
    const user = await userService.getPublicProfile(req.params.userId);
    sendSuccess(res, user);
  }),
};
