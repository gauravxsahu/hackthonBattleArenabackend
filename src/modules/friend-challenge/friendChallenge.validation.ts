import type { Schema } from "../../utils/validation/validate";
import { validateRequiredString } from "../../utils/validation/validators";

export interface JoinFriendChallengeInput {
  code: string;
}

export const joinFriendChallengeSchema: Schema<JoinFriendChallengeInput> = {
  code: (v) => validateRequiredString(v, "code", { minLength: 4, maxLength: 12 }),
};
