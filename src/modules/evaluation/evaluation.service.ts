import { prisma } from "../../config/prisma";
import { automatedCheckService } from "./automatedCheck.service";
import { aiEvaluationService } from "./aiEvaluation.service";
import { evaluationRepository } from "./evaluation.repository";
import { logger } from "../../utils/logger";
import type { GameEvaluationResult, TeamEvaluationResult } from "./evaluation.types";

const AUTOMATED_WEIGHT = 0.7;
const AI_WEIGHT = 0.3;

export const evaluationService = {
  /**
   * Runs hybrid evaluation for every team that submitted in a game and
   * decides the winner. Teams that never submitted are scored 0 (forfeit)
   * so a no-show never blocks the game from completing.
   */
  async evaluateGame(gameId: string): Promise<GameEvaluationResult> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        challenge: true,
        teams: { include: { submissions: true } },
      },
    });
    if (!game) throw new Error(`Game ${gameId} not found during evaluation`);
    if (!game.challenge) throw new Error(`Game ${gameId} has no attached challenge`);

    const requirements = game.challenge.requirements;

    const teamScores: TeamEvaluationResult[] = [];

    for (const team of game.teams) {
      const submission = team.submissions[0];

      if (!submission) {
        teamScores.push({
          teamId: team.id,
          automatedResults: [{ requirement: "Submission received", passed: false, detail: "Team did not submit" }],
          automatedScore: 0,
          aiResults: { functionality: 0, codeQuality: 0, innovation: 0, ui: 0, performance: 0, total: 0, feedback: ["No submission received."] },
          aiScore: 0,
          finalScore: 0,
        });
        continue;
      }

      const automated = await automatedCheckService.runChecks({
        githubUrl: submission.githubUrl,
        description: submission.description,
        requirements,
      });

      const ai = await aiEvaluationService.evaluate({
        challengeTitle: game.challenge.title,
        challengeDescription: game.challenge.description,
        requirements,
        submissionDescription: submission.description,
        githubUrl: submission.githubUrl,
        demoUrl: submission.demoUrl,
        automatedScore: automated.score,
      });

      // Final score is calculated server-side only — the frontend never
      // supplies or can modify scores.
      const finalScore = Math.round(automated.score * AUTOMATED_WEIGHT + ai.total * AI_WEIGHT);

      await evaluationRepository.create({
        submissionId: submission.id,
        teamId: team.id,
        automatedResults: automated.results,
        automatedScore: automated.score,
        aiResults: ai,
        aiScore: ai.total,
        finalScore,
      });

      teamScores.push({
        teamId: team.id,
        automatedResults: automated.results,
        automatedScore: automated.score,
        aiResults: ai,
        aiScore: ai.total,
        finalScore,
      });
    }

    if (teamScores.length !== 2 && game.mode !== "PRACTICE") {
      logger.error("Expected exactly 2 teams for evaluation", { gameId, mode: game.mode, teamCount: teamScores.length });
    }

    const winner = teamScores.reduce((best, current) => (current.finalScore > best.finalScore ? current : best));

    return { gameId, teamScores, winnerTeamId: winner.teamId };
  },

  async getForGame(gameId: string) {
    return evaluationRepository.findByGame(gameId);
  },
};
