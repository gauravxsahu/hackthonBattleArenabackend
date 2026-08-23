import { asyncHandler } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { gameService } from "./game.service";

export const gameController = {
  listMine: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const games = await gameService.listForUser(req.user!.id);
    sendSuccess(res, games);
  }),

  getGame: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await gameService.assertMember(req.params.gameId, req.user!.id);
    const game = await gameService.getGame(req.params.gameId);
    sendSuccess(res, game);
  }),

  ready: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await gameService.markReady(req.params.gameId, req.user!.id);
    sendSuccess(res, result);
  }),

  players: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await gameService.assertMember(req.params.gameId, req.user!.id);
    const players = await gameService.getPlayers(req.params.gameId);
    sendSuccess(res, players);
  }),

  messages: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await gameService.assertMember(req.params.gameId, req.user!.id);
    const before = req.query.before ? new Date(String(req.query.before)) : undefined;
    const limit = req.query.limit ? Math.min(200, Math.max(1, Number(req.query.limit))) : undefined;
    const messages = await gameService.getMessages(req.params.gameId, { before, limit });
    sendSuccess(res, messages);
  }),

  result: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await gameService.assertMember(req.params.gameId, req.user!.id);
    const result = await gameService.getResult(req.params.gameId);
    sendSuccess(res, result);
  }),
};
