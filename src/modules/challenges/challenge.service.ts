import { challengeRepository } from "./challenge.repository";
import { aiChallengeService } from "./aiChallenge.service";
import type { GenerateChallengeInput } from "./challenge.types";
import { NotFoundError } from "../../utils/validation/errors";

export const challengeService = {
  async generateAndStore(input: GenerateChallengeInput) {
    const generated = await aiChallengeService.generate(input);
    return challengeRepository.create({ ...generated, generatedFor: input.skills, mode: input.mode });
  },

  async getById(id: string) {
    const challenge = await challengeRepository.findById(id);
    if (!challenge) throw new NotFoundError("Challenge not found");
    return challenge;
  },
};
