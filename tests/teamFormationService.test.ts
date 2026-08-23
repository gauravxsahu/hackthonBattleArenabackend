import { describe, expect, test } from "bun:test";
import { teamFormationService } from "../src/services/teamFormationService";
import type { PlayerSkillProfile } from "../src/services/skillScoringService";

function player(id: string, rating: number, skills: string[]): PlayerSkillProfile {
  return {
    userId: id,
    rating,
    experienceLevel: "INTERMEDIATE",
    skills: skills.map((name) => ({ name, proficiency: "INTERMEDIATE" as const })),
  };
}

describe("teamFormationService", () => {
  test("throws when given an odd number of players", () => {
    expect(() => teamFormationService.formTeams([player("1", 1000, ["React"])])).toThrow();
    expect(() =>
      teamFormationService.formTeams([player("1", 1000, ["React"]), player("2", 1000, ["Node.js"]), player("3", 1000, ["Python"])])
    ).toThrow();
  });

  test("throws when given zero players", () => {
    expect(() => teamFormationService.formTeams([])).toThrow();
  });

  test("splits 4 players into two teams of 2 (default 2v2 match size)", () => {
    const players = [
      player("1", 1000, ["React"]),
      player("2", 1100, ["Node.js"]),
      player("3", 1200, ["Python"]),
      player("4", 1300, ["Docker"]),
    ];

    const { teamA, teamB } = teamFormationService.formTeams(players);
    expect(teamA.length).toBe(2);
    expect(teamB.length).toBe(2);

    const allIds = new Set([...teamA, ...teamB].map((p) => p.userId));
    expect(allIds.size).toBe(4);
  });

  test("splits 8 players into two teams of 4", () => {
    const players = [
      player("1", 1000, ["React"]),
      player("2", 1050, ["Node.js"]),
      player("3", 1100, ["Python"]),
      player("4", 1150, ["Docker"]),
      player("5", 1200, ["React"]),
      player("6", 1250, ["Node.js"]),
      player("7", 1300, ["Python"]),
      player("8", 1350, ["Docker"]),
    ];

    const { teamA, teamB } = teamFormationService.formTeams(players);
    expect(teamA.length).toBe(4);
    expect(teamB.length).toBe(4);

    const allIds = new Set([...teamA, ...teamB].map((p) => p.userId));
    expect(allIds.size).toBe(8);
  });

  test("does not simply put the 4 highest-rated players on one team", () => {
    const players = [
      player("1", 900, ["React"]),
      player("2", 950, ["Node.js"]),
      player("3", 1000, ["Python"]),
      player("4", 1050, ["Docker"]),
      player("5", 1400, ["React"]),
      player("6", 1450, ["Node.js"]),
      player("7", 1500, ["Python"]),
      player("8", 1550, ["Docker"]),
    ];

    const { teamA, teamB } = teamFormationService.formTeams(players);
    const topFour = new Set(["5", "6", "7", "8"]);
    const teamAIds = new Set(teamA.map((p) => p.userId));
    const teamBIds = new Set(teamB.map((p) => p.userId));

    const allTopFourOnOneTeam =
      [...topFour].every((id) => teamAIds.has(id)) || [...topFour].every((id) => teamBIds.has(id));
    expect(allTopFourOnOneTeam).toBe(false);
  });
});
