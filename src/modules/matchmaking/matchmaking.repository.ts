import { redis, RedisKeys } from "../../config/redis";
import { prisma } from "../../config/prisma";
import type { GameMode } from "../../config/gameModes";

export const matchmakingRepository = {
  async enqueue(userId: string, rating: number, mode: GameMode) {
    await redis.zadd(RedisKeys.matchmakingQueue(mode), rating, userId);
  },

  async dequeue(userId: string, mode: GameMode) {
    await redis.zrem(RedisKeys.matchmakingQueue(mode), userId);
  },

  /** Removes a user from every mode's queue — used on logout/cleanup so a stale entry never lingers in the wrong queue. */
  async dequeueFromAllModes(userId: string, modes: GameMode[]) {
    await Promise.all(modes.map((mode) => redis.zrem(RedisKeys.matchmakingQueue(mode), userId)));
  },

  async isQueued(userId: string, mode: GameMode): Promise<boolean> {
    const score = await redis.zscore(RedisKeys.matchmakingQueue(mode), userId);
    return score !== null;
  },

  async queueSize(mode: GameMode): Promise<number> {
    return redis.zcard(RedisKeys.matchmakingQueue(mode));
  },

  async queuePosition(userId: string, mode: GameMode): Promise<number | null> {
    // Rating-ordered ascending rank; +1 for 1-indexed position.
    const rank = await redis.zrank(RedisKeys.matchmakingQueue(mode), userId);
    return rank === null ? null : rank + 1;
  },

  /** Atomically pops the oldest `count` queued userIds (lowest rating-rank first) if at least `count` are queued. */
  async popIfEnough(count: number, mode: GameMode): Promise<string[] | null> {
    const key = RedisKeys.matchmakingQueue(mode);
    const size = await redis.zcard(key);
    if (size < count) return null;
    const userIds = await redis.zrange(key, 0, count - 1);
    if (userIds.length < count) return null;
    await redis.zrem(key, ...userIds);
    return userIds;
  },

  async fetchPlayerProfiles(userIds: string[]) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        profile: true,
        skills: { include: { skill: true } },
      },
    });
    return users;
  },
};
