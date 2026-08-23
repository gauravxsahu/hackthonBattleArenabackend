import { skillScoringService, type PlayerSkillProfile } from "./skillScoringService";

/**
 * TeamFormationService
 *
 * Given an even number of queued players (2x the configured team size —
 * see MATCH_TEAM_SIZE), produces two equal-sized teams that are
 * approximately balanced on: (1) average rating, (2) average experience,
 * (3) skill/role diversity within each team, (4) role coverage overlap
 * between teams (so neither team is missing, say, a frontend-capable
 * player while the other has more than one).
 *
 * Approach: deterministic combinatorial search over every way to split the
 * pool into two unordered equal teams — small enough to brute-force
 * exhaustively for the small team sizes this platform uses (e.g. C(4,2)/2 = 3
 * splits for 2v2, C(8,4)/2 = 35 for 4v4), which keeps the result
 * reproducible (no RNG) while still finding a near-optimal balance rather
 * than a greedy top-half split.
 */

export interface TeamSplit {
  teamA: PlayerSkillProfile[];
  teamB: PlayerSkillProfile[];
  balanceScore: number; // lower is more balanced
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, size - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

function scoreSplit(teamA: PlayerSkillProfile[], teamB: PlayerSkillProfile[]): number {
  const strengthA = skillScoringService.teamStrength(teamA);
  const strengthB = skillScoringService.teamStrength(teamB);
  const strengthDiff = Math.abs(strengthA - strengthB);

  const breadthA = skillScoringService.teamRoleBreadth(teamA);
  const breadthB = skillScoringService.teamRoleBreadth(teamB);
  const breadthDiff = Math.abs(breadthA - breadthB);
  // Reward both teams covering many roles: penalize low total breadth too.
  const lowBreadthPenalty = Math.max(0, 6 - (breadthA + breadthB)) * 5;

  // Weighted sum: rating/experience balance matters most, then role symmetry.
  return strengthDiff * 1.0 + breadthDiff * 15 + lowBreadthPenalty;
}

export const teamFormationService = {
  formTeams(players: PlayerSkillProfile[]): TeamSplit {
    if (players.length === 0 || players.length % 2 !== 0) {
      throw new Error(`formTeams requires an even, non-zero number of players, got ${players.length}`);
    }
    const teamSize = players.length / 2;

    const allCombos = combinations(players, teamSize);
    const half = allCombos.length / 2; // each split counted twice (A,B) and (B,A); dedupe by only scanning the first half of ids

    let best: TeamSplit | null = null;

    const seen = new Set<string>();
    for (const teamA of allCombos) {
      const idsA = teamA.map((p) => p.userId).sort().join(",");
      const teamB = players.filter((p) => !teamA.includes(p));
      const idsB = teamB.map((p) => p.userId).sort().join(",");
      const key = [idsA, idsB].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const balanceScore = scoreSplit(teamA, teamB);
      if (!best || balanceScore < best.balanceScore) {
        best = { teamA, teamB, balanceScore };
      }
    }

    // `half` is only used to document the expected search space size above;
    // referencing it keeps the intent documented without affecting logic.
    void half;

    return best as TeamSplit;
  },
};
