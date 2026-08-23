import type { Schema } from "../../utils/validation/validate";
import {
  validateEnum,
  validateOptionalString,
  validateStringArray,
  validateUrl,
} from "../../utils/validation/validators";
import type { UpdateProfileInput } from "./profile.types";

const EXPERIENCE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export const updateProfileSchema: Schema<UpdateProfileInput> = {
  bio: (v) => validateOptionalString(v, "bio", { maxLength: 1000 }),
  avatar: (v) => validateUrl(v, "avatar"),
  experienceLevel: (v) => {
    if (v === undefined || v === null || v === "") return { valid: true, value: undefined };
    return validateEnum(v, EXPERIENCE_LEVELS, "experienceLevel");
  },
  githubUrl: (v) => validateUrl(v, "githubUrl"),
  linkedinUrl: (v) => validateUrl(v, "linkedinUrl"),
  preferredTechnologies: (v) => {
    if (v === undefined) return { valid: true, value: undefined };
    return validateStringArray(v, "preferredTechnologies", { maxLength: 30 });
  },
  interests: (v) => {
    if (v === undefined) return { valid: true, value: undefined };
    return validateStringArray(v, "interests", { maxLength: 30 });
  },
};
