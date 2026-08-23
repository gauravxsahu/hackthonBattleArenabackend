import { prisma } from "../../config/prisma";
import type { CreateSubmissionInput } from "./submission.types";

export const submissionRepository = {
  findByTeam(teamId: string) {
    return prisma.submission.findUnique({ where: { teamId } });
  },

  findByGame(gameId: string) {
    return prisma.submission.findMany({ where: { gameId }, include: { team: true, submitter: { select: { id: true, name: true } } } });
  },

  create(data: CreateSubmissionInput & { gameId: string; teamId: string; submittedBy: string }) {
    return prisma.submission.create({ data });
  },
};
