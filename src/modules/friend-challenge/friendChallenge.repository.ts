import { randomBytes } from "crypto";
import { redis, RedisKeys } from "../../config/redis";

const INVITE_TTL_SECONDS = 30 * 60; // 30 minutes to share the link/code and have a friend join

function generateCode(): string {
  // 6 uppercase alphanumeric chars — short enough to read aloud/type, long
  // enough that guessing a live code is impractical within its TTL.
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export const friendChallengeRepository = {
  async createInvite(creatorId: string): Promise<{ code: string; expiresInSeconds: number }> {
    let code = generateCode();
    // Extremely unlikely, but guard against a live collision anyway.
    for (let attempts = 0; attempts < 5 && (await redis.exists(RedisKeys.friendInvite(code))); attempts++) {
      code = generateCode();
    }
    await redis.set(RedisKeys.friendInvite(code), creatorId, "EX", INVITE_TTL_SECONDS);
    return { code, expiresInSeconds: INVITE_TTL_SECONDS };
  },

  async getInviteCreator(code: string): Promise<string | null> {
    return redis.get(RedisKeys.friendInvite(code));
  },

  async deleteInvite(code: string): Promise<void> {
    await redis.del(RedisKeys.friendInvite(code));
  },
};
