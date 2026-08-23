import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/validation/errors";
import { gameRepository } from "./game.repository";
import { gameEvents } from "../../services/gameEvents";
import { gameTimerService } from "../../services/gameTimerService";
import { challengeService } from "../challenges/challenge.service";
import { skillRepository } from "../skills/skill.repository";
import { evaluationService } from "../evaluation/evaluation.service";
import { rewardsService } from "../rewards/rewards.service";
import { matchmakingRepository } from "../matchmaking/matchmaking.repository";
import { GAME_MODE_CONFIG, type GameMode } from "../../config/gameModes";
import { logger } from "../../utils/logger";
import type { FormedTeamInput } from "./game.types";

const SUBMISSION_GRACE_MS = 2 * 60 * 1000; // 2 minutes after RUNNING ends to still submit
const READY_CHECK_TIMEOUT_MS = 90 * 1000; // players have 90s to all ready up before the match is cancelled

// Ready-check timers live in-process, same caveat as gameTimerService: fine
// for a single-instance deployment, would move to a distributed scheduler
// for a multi-instance one.
const readyCheckTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const gameService = {
  /** Called by MatchmakingService / PracticeService / FriendChallengeService once team(s) are assigned. */
  async createFromFormedTeams(teams: FormedTeamInput[], mode: GameMode) {
    const game = await gameRepository.createWithTeams(teams, mode);
    this.scheduleReadyCheckTimeout(game.id);
    return game;
  },

  /** Arms a timeout that cancels the match if not everyone readies up in time. */
  scheduleReadyCheckTimeout(gameId: string) {
    this.clearReadyCheckTimeout(gameId);
    const handle = setTimeout(() => {
      readyCheckTimers.delete(gameId);
      this.cancelForIncompleteReadyCheck(gameId).catch((err) =>
        logger.error("Failed to cancel game after ready-check timeout", { gameId, error: String(err) })
      );
    }, READY_CHECK_TIMEOUT_MS);
    readyCheckTimers.set(gameId, handle);
  },

  clearReadyCheckTimeout(gameId: string) {
    const existing = readyCheckTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      readyCheckTimers.delete(gameId);
    }
  },

  /**
   * Fires when the ready-check window expires with at least one player
   * still not ready. Cancels the game and, for queue-based modes, returns
   * any players who *did* ready up back to the matchmaking queue (at their
   * real rating) so they don't have to wait through the whole search
   * again. Invite-based (FRIEND_CHALLENGE) and solo (PRACTICE) games have
   * no queue to return to — they're just cancelled outright.
   */
  async cancelForIncompleteReadyCheck(gameId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game || !["TEAM_FORMING", "READY"].includes(game.status)) return; // already progressed or already cancelled

    const mode = game.mode as GameMode;
    const allMembers = game.teams.flatMap((t) => t.members);
    const notReadyUserIds = allMembers.filter((m) => !m.isReady).map((m) => m.userId);
    const readyMembers = allMembers.filter((m) => m.isReady);

    await gameRepository.updateStatus(gameId, "CANCELLED");

    if (GAME_MODE_CONFIG[mode].usesQueue) {
      for (const member of readyMembers) {
        await matchmakingRepository.enqueue(member.userId, member.user.rating, mode);
      }
    }

    gameEvents.emitTyped("game:cancelled", {
      gameId,
      reason: "Not all players readied up in time",
      notReadyUserIds,
    });

    logger.info("Game cancelled for incomplete ready check", { gameId, mode, notReadyUserIds, requeued: readyMembers.length });
  },

  async getGame(gameId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game) throw new NotFoundError("Game not found");
    return game;
  },

  async listForUser(userId: string) {
    return gameRepository.listForUser(userId, { limit: 20 });
  },

  async assertMember(gameId: string, userId: string) {
    const membership = await gameRepository.isUserInGame(gameId, userId);
    if (!membership) throw new ForbiddenError("You are not a participant in this game");
    return membership;
  },

  async getPlayers(gameId: string) {
    await this.getGame(gameId); // 404 if game doesn't exist
    return gameRepository.listPlayers(gameId);
  },

  async getMessages(gameId: string, opts: { before?: Date; limit?: number } = {}) {
    await this.getGame(gameId);
    return gameRepository.listMessages(gameId, opts);
  },

  async markReady(gameId: string, userId: string) {
    const game = await this.getGame(gameId);
    await this.assertMember(gameId, userId);

    if (!["TEAM_FORMING", "READY"].includes(game.status)) {
      throw new ConflictError("Game is not accepting ready checks right now", "GAME_NOT_READYABLE");
    }

    await gameRepository.setReady(gameId, userId);
    gameEvents.emitTyped("game:player-status", { gameId, userId, isReady: true });

    const [readyCount, totalCount] = await Promise.all([
      gameRepository.countReadyMembers(gameId),
      gameRepository.countTotalMembers(gameId),
    ]);

    if (readyCount === totalCount && totalCount > 0) {
      this.clearReadyCheckTimeout(gameId); // everyone's in — no need to auto-cancel anymore
      await this.startGame(gameId);
    } else if (game.status === "TEAM_FORMING") {
      await gameRepository.updateStatus(gameId, "READY");
    }

    return { readyCount, totalCount };
  },

  /** Generates the challenge, flips the game to RUNNING, and arms the server-authoritative timer. */
  async startGame(gameId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game) throw new NotFoundError("Game not found");
    if (game.status === "RUNNING") return game; // idempotent guard

    const mode = game.mode as GameMode;
    const modeConfig = GAME_MODE_CONFIG[mode];

    const allUserIds = game.teams.flatMap((t) => t.members.map((m) => m.userId));
    const skillSets = await Promise.all(allUserIds.map((id) => skillRepository.listForUser(id)));
    const uniqueSkillNames = Array.from(new Set(skillSets.flat().map((s) => s.skill.name)));

    // Team level = the more experienced average across all players in this game, approximated from ratings.
    const avgRating = game.teams
      .flatMap((t) => t.members.map((m) => m.user.rating))
      .reduce((a, b) => a + b, 0) / Math.max(1, allUserIds.length);
    const teamLevel = avgRating >= 1300 ? "ADVANCED" : avgRating >= 1100 ? "INTERMEDIATE" : "BEGINNER";

    const challenge = await challengeService.generateAndStore({
      duration: modeConfig.durationMinutes,
      teamLevel,
      skills: uniqueSkillNames.slice(0, 12),
      mode,
      playerCount: allUserIds.length,
    });

    await gameRepository.attachChallenge(gameId, challenge.id);

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + modeConfig.durationMinutes * 60 * 1000);
    const updated = await gameRepository.startGame(gameId, startTime, endTime);

    gameEvents.emitTyped("game:start", { gameId, startTime: startTime.toISOString(), endTime: endTime.toISOString() });

    gameTimerService.startTicking(gameId, endTime, 5000, (remainingMs) => {
      gameEvents.emitTyped("game:timer", { gameId, remainingMs });
    });

    gameTimerService.scheduleEnd(gameId, endTime, () => {
      this.transitionToSubmission(gameId).catch((err) =>
        logger.error("Failed to transition game to SUBMISSION", { gameId, error: String(err) })
      );
    });

    return updated;
  },

  async transitionToSubmission(gameId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game || game.status !== "RUNNING") return;

    await gameRepository.updateStatus(gameId, "SUBMISSION");
    gameEvents.emitTyped("game:submission-phase", { gameId });

    // Grace window, then force evaluation regardless of whether both teams submitted.
    setTimeout(() => {
      this.transitionToEvaluating(gameId).catch((err) =>
        logger.error("Failed to transition game to EVALUATING", { gameId, error: String(err) })
      );
    }, SUBMISSION_GRACE_MS);
  },

  async transitionToEvaluating(gameId: string) {
    const game = await gameRepository.findById(gameId);
    if (!game || game.status !== "SUBMISSION") return;

    await gameRepository.updateStatus(gameId, "EVALUATING");
    gameEvents.emitTyped("game:evaluating", { gameId });

    const mode = game.mode as GameMode;
    const result = await evaluationService.evaluateGame(gameId);

    await gameRepository.setWinner(gameId, result.winnerTeamId);

    if (mode === "PRACTICE") {
      // Solo mode: no opponent, so no win/loss/rating change — just a
      // score-scaled coin/XP bonus. See rewards.service.ts.
      await rewardsService.applyPracticeReward(gameId, result.winnerTeamId);
    } else {
      await rewardsService.applyGameRewards(gameId, result.winnerTeamId);
    }

    gameTimerService.clear(gameId);

    gameEvents.emitTyped("game:end", { gameId, winnerTeamId: result.winnerTeamId });
    gameEvents.emitTyped("game:result", { gameId, result });

    return result;
  },

  async getResult(gameId: string) {
    const game = await this.getGame(gameId);
    if (!["COMPLETED"].includes(game.status)) {
      throw new ConflictError("Game has not finished yet", "GAME_NOT_COMPLETED");
    }
    return game;
  },
};
