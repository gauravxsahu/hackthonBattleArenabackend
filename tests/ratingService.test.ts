import { describe, expect, test } from "bun:test";
import { computeRatingDelta, expectedScore, teamAverageRating } from "../src/services/ratingService";

describe("ratingService", () => {
  test("teamAverageRating averages member ratings", () => {
    expect(teamAverageRating([1000, 1100, 1200, 1300])).toBe(1150);
  });

  test("expectedScore is 0.5 for equal ratings", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });

  test("higher-rated team gains fewer points for winning than an underdog would", () => {
    const favoriteWins = computeRatingDelta([1400, 1400, 1400, 1400], [1000, 1000, 1000, 1000]);
    const underdogWins = computeRatingDelta([1000, 1000, 1000, 1000], [1400, 1400, 1400, 1400]);
    expect(favoriteWins.winnerDelta).toBeLessThan(underdogWins.winnerDelta);
  });

  test("winner always gains and loser always loses rating", () => {
    const { winnerDelta, loserDelta } = computeRatingDelta([1000, 1000, 1000, 1000], [1000, 1000, 1000, 1000]);
    expect(winnerDelta).toBeGreaterThan(0);
    expect(loserDelta).toBeLessThan(0);
  });
});
