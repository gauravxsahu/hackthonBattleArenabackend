/**
 * ELO-style rating calculation, isolated from the rewards module so it can
 * be unit tested and tuned independently.
 *
 * We treat each *team* as a unit: the team's effective rating is the
 * average of its members' ratings, and every member on the winning team
 * moves by the same delta (individual variance could be layered on later
 * via a per-player K-factor).
 */

const K_FACTOR = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function teamAverageRating(memberRatings: number[]): number {
  if (memberRatings.length === 0) return 1000;
  return memberRatings.reduce((a, b) => a + b, 0) / memberRatings.length;
}

export interface RatingDelta {
  winnerDelta: number;
  loserDelta: number;
}

/** Computes the symmetric rating delta for a completed 1v1-team match. */
export function computeRatingDelta(winnerTeamRatings: number[], loserTeamRatings: number[]): RatingDelta {
  const winnerAvg = teamAverageRating(winnerTeamRatings);
  const loserAvg = teamAverageRating(loserTeamRatings);

  const winnerExpected = expectedScore(winnerAvg, loserAvg);
  const loserExpected = expectedScore(loserAvg, winnerAvg);

  const winnerDelta = Math.round(K_FACTOR * (1 - winnerExpected));
  const loserDelta = Math.round(K_FACTOR * (0 - loserExpected));

  return { winnerDelta, loserDelta };
}
