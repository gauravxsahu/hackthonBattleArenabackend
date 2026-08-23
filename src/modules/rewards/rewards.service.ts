import { computeRatingDelta } from "../../services/ratingService";
import { rewardsRepository } from "./rewards.repository";
import { redis, RedisKeys } from "../../config/redis";
import { prisma } from "../../config/prisma";
import { logger } from "../../utils/logger";

const WIN_COINS = 100;
const WIN_XP = 50;
const LOSS_COINS = 25;
const LOSS_XP = 20;

export const rewardsService = {
  /**
   * Applies the full reward pipeline for a completed game: rating (ELO),
   * coins (via an auditable CoinTransaction — never a bare `+=`), XP,
   * win/loss counters, and badge checks. Also refreshes each player's
   * entry in the Redis leaderboard sorted set.
   */
  async applyGameRewards(gameId: string, winnerTeamId: string) {
    const teams = await prisma.team.findMany({
      where: { gameId },
      include: { members: { include: { user: true } } },
    });

    const winnerTeam = teams.find((t) => t.id === winnerTeamId);
    const loserTeams = teams.filter((t) => t.id !== winnerTeamId);

    if (!winnerTeam) {
      logger.error("applyGameRewards: winner team not found among game teams", { gameId, winnerTeamId });
      return;
    }

    const winnerRatings = winnerTeam.members.map((m) => m.user.rating);
    const loserRatings = loserTeams.flatMap((t) => t.members.map((m) => m.user.rating));
    const { winnerDelta, loserDelta } = computeRatingDelta(winnerRatings, loserRatings);

    for (const member of winnerTeam.members) {
      const updated = await rewardsRepository.applyPlayerRewards({
        userId: member.userId,
        gameId,
        coinDelta: WIN_COINS,
        xpDelta: WIN_XP,
        ratingDelta: winnerDelta,
        isWinner: true,
        coinType: "GAME_WIN",
      });
      await this.checkAndAwardBadges(member.userId, updated);
      await redis.zadd(RedisKeys.leaderboard, updated.rating, member.userId);
    }

    for (const team of loserTeams) {
      for (const member of team.members) {
        const updated = await rewardsRepository.applyPlayerRewards({
          userId: member.userId,
          gameId,
          coinDelta: LOSS_COINS,
          xpDelta: LOSS_XP,
          ratingDelta: loserDelta,
          isWinner: false,
          coinType: "GAME_LOSS",
        });
        await this.checkAndAwardBadges(member.userId, updated);
        await redis.zadd(RedisKeys.leaderboard, updated.rating, member.userId);
      }
    }
  },

  async checkAndAwardBadges(userId: string, user: { wins: number; currentWinStreak: number }) {
    if (user.wins === 1) {
      await rewardsRepository.awardBadgeIfMissing(userId, "FIRST_WIN");
    }
    if (user.wins === 5) {
      await rewardsRepository.awardBadgeIfMissing(userId, "FIVE_WINS");
    }
    if (user.currentWinStreak >= 3) {
      await rewardsRepository.awardBadgeIfMissing(userId, "WIN_STREAK");
    }
    if (user.wins >= 10) {
      await rewardsRepository.awardBadgeIfMissing(userId, "HACKATHON_CHAMPION");
    }
  },

  /**
   * Practice-mode reward: there's no opponent, so no rating change and no
   * win/loss counter — just a small coin+XP bonus scaled to how well the
   * solo submission scored. Badges/leaderboard are untouched, matching the
   * design decision that practice never inflates competitive standing.
   */
  async applyPracticeReward(gameId: string, soloTeamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: soloTeamId },
      include: { members: true, submissions: { include: { evaluation: true } } },
    });
    if (!team) {
      logger.error("applyPracticeReward: team not found", { gameId, soloTeamId });
      return;
    }

    const finalScore = team.submissions[0]?.evaluation?.finalScore ?? 0;
    const amount = Math.max(5, Math.round(finalScore / 2)); // small floor so even a low score gives something

    for (const member of team.members) {
      await rewardsRepository.applyBonusReward({
        userId: member.userId,
        gameId,
        amount,
        description: "Solo practice reward",
      });
    }
  },
};
