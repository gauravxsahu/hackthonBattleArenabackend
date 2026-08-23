import { prisma } from "../../config/prisma";

export const evaluationRepository = {
  create(data: {
    submissionId: string;
    teamId: string;
    automatedResults: unknown;
    automatedScore: number;
    aiResults: unknown;
    aiScore: number;
    finalScore: number;
  }) {
    return prisma.evaluation.create({ data: data as never });
  },

  findByGame(gameId: string) {
    return prisma.evaluation.findMany({ where: { submission: { gameId } }, include: { team: true } });
  },
};
