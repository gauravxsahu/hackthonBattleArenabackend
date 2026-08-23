import { ConflictError } from "../../utils/validation/errors";
import { gameRepository } from "../games/game.repository";
import { gameService } from "../games/game.service";

export const practiceService = {
  /**
   * Starts a solo practice game immediately: one player, one team, no
   * queue, no opponent, no ready-check wait — the user IS the only
   * participant, so they're auto-marked ready right after the game (and
   * its single team) are created, which triggers the normal startGame
   * flow (AI challenge generation + server timer) with zero delay.
   */
  async start(userId: string) {
    const activeGame = await gameRepository.findActiveGameForUser(userId);
    if (activeGame) {
      throw new ConflictError("You are already in an active game", "ALREADY_IN_GAME");
    }

    const game = await gameService.createFromFormedTeams([{ side: "TEAM_A", userIds: [userId] }], "PRACTICE");
    await gameService.markReady(game.id, userId);
    return gameService.getGame(game.id);
  },
};
