import { prisma } from "../../config/prisma";
import type { AIChallengeResponse } from "../../utils/validation/aiResponses";
import type { ChallengeMode } from "./challenge.types";

export const challengeRepository = {
  create(data: AIChallengeResponse & { generatedFor: string[]; mode: ChallengeMode }) {
    return prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        requirements: data.requirements,
        bonusRequirements: data.bonusRequirements,
        evaluationCriteria: data.evaluationCriteria,
        generatedFor: data.generatedFor,
        mode: data.mode as never,
        starterCode: data.starterCode ?? null,
      },
    });
  },

  findById(id: string) {
    return prisma.challenge.findUnique({ where: { id } });
  },
};
