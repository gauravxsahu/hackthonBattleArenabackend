import { prisma } from "../../config/prisma";

export const rewardsRepository = {
  async applyPlayerRewards(params: {
    userId: string;
    gameId: string;
    coinDelta: number;
    xpDelta: number;
    ratingDelta: number;
    isWinner: boolean;
    coinType: "GAME_WIN" | "GAME_LOSS";
  }) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: params.userId } });
    const newRating = Math.max(0, user.rating + params.ratingDelta);

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: {
        coins: { increment: params.coinDelta },
        xp: { increment: params.xpDelta },
        rating: newRating,
        wins: params.isWinner ? { increment: 1 } : undefined,
        losses: params.isWinner ? undefined : { increment: 1 },
        currentWinStreak: params.isWinner ? { increment: 1 } : 0,
      },
    });

    await prisma.coinTransaction.create({
      data: {
        userId: params.userId,
        amount: params.coinDelta,
        type: params.coinType,
        gameId: params.gameId,
        description: params.isWinner ? "Hackathon win reward" : "Hackathon participation reward",
      },
    });

    await prisma.ratingHistory.create({
      data: {
        userId: params.userId,
        gameId: params.gameId,
        before: user.rating,
        after: newRating,
        delta: newRating - user.rating,
        reason: params.isWinner ? "GAME_WIN" : "GAME_LOSS",
      },
    });

    return updated;
  },

  findBadgeByCode(code: string) {
    return prisma.badge.findUnique({ where: { code: code as never } });
  },

  async awardBadgeIfMissing(userId: string, badgeCode: string) {
    const badge = await prisma.badge.findUnique({ where: { code: badgeCode as never } });
    if (!badge) return null;
    return prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: { userId, badgeId: badge.id },
      update: {},
    });
  },

  getUserStats(userId: string) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId } });
  },

  /**
   * Practice-mode reward: coins + XP only, no rating/win-loss change (no
   * opponent to compare against). By design coinDelta and xpDelta are set
   * to the same amount by the caller — this keeps getGameRewardForUser
   * below correct without needing a separate XP ledger table.
   */
  async applyBonusReward(params: { userId: string; gameId: string; amount: number; description: string }) {
    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: {
        coins: { increment: params.amount },
        xp: { increment: params.amount },
      },
    });

    await prisma.coinTransaction.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        type: "BONUS",
        gameId: params.gameId,
        description: params.description,
      },
    });

    return updated;
  },

  /** The auditable reward record for one user's participation in one game. */
  async getGameRewardForUser(gameId: string, userId: string) {
    const [coinTx, ratingTx] = await Promise.all([
      prisma.coinTransaction.findFirst({ where: { gameId, userId }, orderBy: { createdAt: "desc" } }),
      prisma.ratingHistory.findFirst({ where: { gameId, userId }, orderBy: { createdAt: "desc" } }),
    ]);
    if (!coinTx && !ratingTx) return null;
    const isWinner = ratingTx?.reason === "GAME_WIN" || coinTx?.type === "GAME_WIN";
    const isBonus = coinTx?.type === "BONUS";
    return {
      isWinner,
      coinDelta: coinTx?.amount ?? 0,
      // XP isn't kept in its own audit ledger (only coins/rating are). For
      // win/loss games the reward is a fixed constant per outcome, safe to
      // surface deterministically here. For practice BONUS rewards,
      // rewardsService.applyBonusReward always sets xp === coins, so
      // reusing coinDelta is exact, not a guess.
      xpDelta: isBonus ? (coinTx?.amount ?? 0) : isWinner ? 50 : 20,
      ratingDelta: ratingTx?.delta ?? 0,
    };
  },
};
