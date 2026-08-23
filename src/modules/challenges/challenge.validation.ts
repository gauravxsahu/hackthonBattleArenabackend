import type { Schema } from "../../utils/validation/validate";
import { validateEnum, validateNumber, validateStringArray } from "../../utils/validation/validators";
import type { GenerateChallengeInput } from "./challenge.types";

const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
const MODES = ["BATTLE", "BUG_FIX", "PRACTICE", "FRIEND_CHALLENGE"] as const;

export const generateChallengeSchema: Schema<GenerateChallengeInput> = {
  duration: (v) => validateNumber(v, "duration", { min: 5, max: 180, integer: true }),
  teamLevel: (v) => validateEnum(v, DIFFICULTIES, "teamLevel"),
  skills: (v) => validateStringArray(v, "skills", { maxLength: 20 }),
  mode: (v) => validateEnum(v, MODES, "mode"),
  playerCount: (v) => validateNumber(v, "playerCount", { min: 1, max: 8, integer: true }),
};
