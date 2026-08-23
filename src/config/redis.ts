import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

// Redis keys used across the app, centralized so modules don't hardcode strings.
export const RedisKeys = {
  // One queue per game mode so a BATTLE (4-player) search never mixes with
  // a BUG_FIX (2-player) search.
  matchmakingQueue: (mode: string) => `matchmaking:queue:${mode}`,
  matchmakingUser: (userId: string) => `matchmaking:user:${userId}`, // hash of queued player's snapshot
  leaderboard: "leaderboard:rating", // sorted set: score = rating, member = userId
  gameTimer: (gameId: string) => `game:${gameId}:timer`,
  // FRIEND_CHALLENGE invites: short-lived code -> creator's userId.
  friendInvite: (code: string) => `friend-invite:${code}`,
};
