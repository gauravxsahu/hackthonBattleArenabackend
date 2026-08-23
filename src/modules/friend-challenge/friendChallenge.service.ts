import { ConflictError, NotFoundError, ValidationError } from "../../utils/validation/errors";
import { friendChallengeRepository } from "./friendChallenge.repository";
import { gameRepository } from "../games/game.repository";
import { gameService } from "../games/game.service";
import { gameEvents } from "../../services/gameEvents";

export const friendChallengeService = {
  /** Creator generates a shareable code/link; the game itself isn't created until someone joins. */
  async create(creatorId: string) {
    const activeGame = await gameRepository.findActiveGameForUser(creatorId);
    if (activeGame) {
      throw new ConflictError("You are already in an active game", "ALREADY_IN_GAME");
    }
    return friendChallengeRepository.createInvite(creatorId);
  },

  /** Friend joins via the code — this is the moment the actual 1v1 game is created. */
  async join(joinerId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const creatorId = await friendChallengeRepository.getInviteCreator(normalizedCode);
    if (!creatorId) {
      throw new NotFoundError("This invite code is invalid or has expired");
    }
    if (creatorId === joinerId) {
      throw new ValidationError("You can't join your own challenge");
    }

    const [creatorActiveGame, joinerActiveGame] = await Promise.all([
      gameRepository.findActiveGameForUser(creatorId),
      gameRepository.findActiveGameForUser(joinerId),
    ]);
    if (creatorActiveGame) {
      await friendChallengeRepository.deleteInvite(normalizedCode);
      throw new ConflictError("The player who created this challenge is already in another game", "ALREADY_IN_GAME");
    }
    if (joinerActiveGame) {
      throw new ConflictError("You are already in an active game", "ALREADY_IN_GAME");
    }

    const game = await gameService.createFromFormedTeams(
      [
        { side: "TEAM_A", userIds: [creatorId] },
        { side: "TEAM_B", userIds: [joinerId] },
      ],
      "FRIEND_CHALLENGE"
    );

    await friendChallengeRepository.deleteInvite(normalizedCode);

    // Reuses the same event the queue-based matchmaking flow emits, so the
    // creator's already-listening frontend (waiting on their invite page)
    // picks it up and redirects exactly like a normal match.
    gameEvents.emitTyped("matchmaking:matched", { gameId: game.id, userIds: [creatorId, joinerId] });

    return game;
  },
};
