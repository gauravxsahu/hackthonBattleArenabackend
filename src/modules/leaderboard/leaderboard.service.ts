import { leaderboardRepository } from "./leaderboard.repository";

export const leaderboardService = {
  async getTop(limit = 50) {
    let entries = await leaderboardRepository.getTopFromRedis(limit);

    if (entries.length === 0) {
      // Redis leaderboard is empty (e.g. fresh deploy before any game
      // completed, or cache was flushed) — rebuild it from Postgres once
      // and retry, so the endpoint is never just empty.
      await leaderboardRepository.rebuildFromDatabase();
      entries = await leaderboardRepository.getTopFromRedis(limit);
    }

    const users = await leaderboardRepository.findUsersByIds(entries.map((e) => e.userId));
    const byId = new Map(users.map((u) => [u.id, u]));

    return entries
      .map((entry, index) => {
        const user = byId.get(entry.userId);
        if (!user) return null;
        return {
          rank: index + 1,
          userId: user.id,
          name: user.name,
          rating: user.rating,
          wins: user.wins,
          losses: user.losses,
          coins: user.coins,
          xp: user.xp,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  },

  async getMyRank(userId: string) {
    const [rank, user] = await Promise.all([
      leaderboardRepository.getRankFromRedis(userId),
      leaderboardRepository.findUserById(userId),
    ]);
    if (!user) return null;
    return {
      rank,
      userId: user.id,
      name: user.name,
      rating: user.rating,
      wins: user.wins,
      losses: user.losses,
      coins: user.coins,
      xp: user.xp,
    };
  },
};
