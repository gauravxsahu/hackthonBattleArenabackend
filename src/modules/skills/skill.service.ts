import { NotFoundError } from "../../utils/validation/errors";
import { skillRepository } from "./skill.repository";
import type { AddUserSkillInput } from "./skill.types";

export const skillService = {
  listSkills() {
    return skillRepository.listAll();
  },

  listUserSkills(userId: string) {
    return skillRepository.listForUser(userId);
  },

  async addOrUpdateUserSkill(userId: string, input: AddUserSkillInput) {
    const skill = await skillRepository.findById(input.skillId);
    if (!skill) throw new NotFoundError("Skill not found");
    return skillRepository.upsertUserSkill(userId, input.skillId, input.proficiency);
  },

  async updateUserSkill(userId: string, skillId: string, proficiency: string) {
    const existing = await skillRepository.findUserSkill(userId, skillId);
    if (!existing) throw new NotFoundError("You have not added this skill yet");
    return skillRepository.updateUserSkillProficiency(userId, skillId, proficiency);
  },

  async removeUserSkill(userId: string, skillId: string) {
    const existing = await skillRepository.findUserSkill(userId, skillId);
    if (!existing) throw new NotFoundError("You have not added this skill yet");
    await skillRepository.deleteUserSkill(userId, skillId);
  },
};
