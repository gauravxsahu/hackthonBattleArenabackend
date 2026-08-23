import { prisma } from "../../config/prisma";
import { redis, RedisKeys } from "../../config/redis";

export const leaderboardRepository = {
  /** Top N userIds with scores from the Redis sorted set (score = rating). */
  async getTopFromRedis(limit: number): Promise<{ userId: string; rating: number }[]> {
    const raw = await redis.zrevrange(RedisKeys.leaderboard, 0, limit - 1, "WITHSCORES");
    const results: { userId: string; rating: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      results.push({ userId: raw[i], rating: Number(raw[i + 1]) });
    }
    return results;
  },

  async getRankFromRedis(userId: string): Promise<number | null> {
    const rank = await redis.zrevrank(RedisKeys.leaderboard, userId);
    return rank === null ? null : rank + 1;
  },

  async rebuildFromDatabase(): Promise<void> {
    const users = await prisma.user.findMany({ select: { id: true, rating: true } });
    if (users.length === 0) return;
    const pipeline = redis.pipeline();
    pipeline.del(RedisKeys.leaderboard);
    for (const user of users) {
      pipeline.zadd(RedisKeys.leaderboard, user.rating, user.id);
    }
    await pipeline.exec();
  },

  findUsersByIds(userIds: string[]) {
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, rating: true, wins: true, losses: true, coins: true, xp: true },
    });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, rating: true, wins: true, losses: true, coins: true, xp: true },
    });
  },
};
