import { prisma } from "../../config/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/validation/errors";
import { submissionRepository } from "./submission.repository";
import type { CreateSubmissionInput } from "./submission.types";

async function findUserTeamInGame(gameId: string, userId: string) {
  return prisma.teamMember.findFirst({
    where: { userId, team: { gameId } },
    include: { team: { include: { game: true } } },
  });
}

export const submissionService = {
  async submit(gameId: string, userId: string, input: CreateSubmissionInput) {
    const membership = await findUserTeamInGame(gameId, userId);
    if (!membership) throw new ForbiddenError("You are not a participant in this game");

    const game = membership.team.game;
    if (!["RUNNING", "SUBMISSION"].includes(game.status)) {
      throw new ConflictError("Submissions are not open for this game", "SUBMISSIONS_CLOSED");
    }
    if (game.endTime && Date.now() > game.endTime.getTime() + 2 * 60 * 1000) {
      // Mirrors the grace window in game.service's transitionToSubmission.
      throw new ConflictError("The submission deadline has passed", "DEADLINE_PASSED");
    }

    const existing = await submissionRepository.findByTeam(membership.teamId);
    if (existing) {
      throw new ConflictError("Your team has already submitted a final solution", "ALREADY_SUBMITTED");
    }

    return submissionRepository.create({
      ...input,
      gameId,
      teamId: membership.teamId,
      submittedBy: userId,
    });
  },

  async listForGame(gameId: string, userId: string) {
    const membership = await findUserTeamInGame(gameId, userId);
    if (!membership) throw new ForbiddenError("You are not a participant in this game");
    return submissionRepository.findByGame(gameId);
  },
};
