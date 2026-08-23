import type { Schema } from "../../utils/validation/validate";
import { validateEnum, validateUuid } from "../../utils/validation/validators";
import type { AddUserSkillInput, UpdateUserSkillInput } from "./skill.types";

const PROFICIENCY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export const addUserSkillSchema: Schema<AddUserSkillInput> = {
  skillId: (v) => validateUuid(v, "skillId"),
  proficiency: (v) => validateEnum(v, PROFICIENCY_LEVELS, "proficiency"),
};

export const updateUserSkillSchema: Schema<UpdateUserSkillInput> = {
  proficiency: (v) => validateEnum(v, PROFICIENCY_LEVELS, "proficiency"),
};

export const skillIdParamSchema = {
  skillId: (v: unknown) => validateUuid(v, "skillId"),
};
