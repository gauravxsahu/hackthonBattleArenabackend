import { ConflictError } from "../../utils/validation/errors";
import { matchmakingRepository } from "./matchmaking.repository";
import { gameRepository } from "../games/game.repository";
import { gameService } from "../games/game.service";
import { gameEvents } from "../../services/gameEvents";
import { teamFormationService } from "../../services/teamFormationService";
import type { PlayerSkillProfile } from "../../services/skillScoringService";
import { GAME_MODE_CONFIG, type GameMode } from "../../config/gameModes";
import { logger } from "../../utils/logger";
import type { QueueStatus } from "./matchmaking.types";

// Modes that actually use the Redis queue (BATTLE, BUG_FIX). PRACTICE and
// FRIEND_CHALLENGE never touch this service — they have their own modules.
const QUEUEABLE_MODES: GameMode[] = (Object.keys(GAME_MODE_CONFIG) as GameMode[]).filter(
  (mode) => GAME_MODE_CONFIG[mode].usesQueue
);

function toPlayerProfile(user: {
  id: string;
  rating: number;
  profile: { experienceLevel: string } | null;
  skills: { proficiency: string; skill: { name: string } }[];
}): PlayerSkillProfile {
  return {
    userId: user.id,
    rating: user.rating,
    experienceLevel: (user.profile?.experienceLevel as PlayerSkillProfile["experienceLevel"]) ?? "BEGINNER",
    skills: user.skills.map((s) => ({ name: s.skill.name, proficiency: s.proficiency as never })),
  };
}

export const matchmakingService = {
  async join(userId: string, rating: number, mode: GameMode) {
    const activeGame = await gameRepository.findActiveGameForUser(userId);
    if (activeGame) {
      throw new ConflictError("You are already in an active game", "ALREADY_IN_GAME");
    }

    const alreadyQueued = await matchmakingRepository.isQueued(userId, mode);
    if (alreadyQueued) {
      throw new ConflictError("You are already in the matchmaking queue", "ALREADY_QUEUED");
    }

    await matchmakingRepository.enqueue(userId, rating, mode);
    await this.tryFormMatch(mode);

    return this.status(userId, mode);
  },

  async leave(userId: string, mode: GameMode) {
    await matchmakingRepository.dequeue(userId, mode);
    return this.status(userId, mode);
  },

  async status(userId: string, mode: GameMode): Promise<QueueStatus> {
    const [inQueue, queuePosition, queueSize, activeGame] = await Promise.all([
      matchmakingRepository.isQueued(userId, mode),
      matchmakingRepository.queuePosition(userId, mode),
      matchmakingRepository.queueSize(mode),
      gameRepository.findActiveGameForUser(userId),
    ]);

    return {
      mode,
      inQueue,
      queuePosition,
      queueSize,
      matchedGameId: activeGame?.id ?? null,
    };
  },

  /**
   * Attempts to pop this mode's required player count from its queue and
   * form a game. Safe to call repeatedly/concurrently: popIfEnough is
   * atomic at the Redis level, so at most one caller wins the pop for a
   * given batch.
   */
  async tryFormMatch(mode: GameMode) {
    if (!QUEUEABLE_MODES.includes(mode)) return null;
    const required = GAME_MODE_CONFIG[mode].playersRequired;
    const userIds = await matchmakingRepository.popIfEnough(required, mode);
    if (!userIds) return null;

    try {
      const users = await matchmakingRepository.fetchPlayerProfiles(userIds);
      if (users.length !== required) {
        // A popped userId doesn't correspond to a real user anymore (e.g. the
        // database was reset/reseeded without also flushing Redis, leaving a
        // stale id in the queue). Re-queue only the still-valid players and
        // permanently drop the invalid id(s) — re-queuing them too would
        // otherwise poison every future batch that happens to include them.
        const validIds = new Set(users.map((u) => u.id));
        const invalidIds = userIds.filter((id) => !validIds.has(id));
        logger.warn("Matchmaking pop returned fewer valid users than expected — dropping stale id(s)", {
          mode,
          expected: required,
          got: users.length,
          invalidIds,
        });
        for (const user of users) await matchmakingRepository.enqueue(user.id, user.rating, mode);
        return null;
      }

      const profiles = users.map(toPlayerProfile);
      const { teamA, teamB } = teamFormationService.formTeams(profiles);

      const game = await gameService.createFromFormedTeams(
        [
          { side: "TEAM_A", userIds: teamA.map((p) => p.userId) },
          { side: "TEAM_B", userIds: teamB.map((p) => p.userId) },
        ],
        mode
      );

      gameEvents.emitTyped("matchmaking:matched", { gameId: game.id, userIds });
      return game;
    } catch (err) {
      // Something went wrong forming the game — return players to the queue
      // rather than losing them.
      logger.error("Failed to form match, re-queueing players", { mode, error: String(err) });
      for (const id of userIds) await matchmakingRepository.enqueue(id, 1000, mode);
      throw err;
    }
  },
};
