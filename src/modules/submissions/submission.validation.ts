import type { Schema } from "../../utils/validation/validate";
import { validateGithubUrl, validateRequiredString, validateUrl } from "../../utils/validation/validators";
import type { CreateSubmissionInput } from "./submission.types";

export const createSubmissionSchema: Schema<CreateSubmissionInput> = {
  githubUrl: (v) => {
    const result = validateGithubUrl(v, "githubUrl", { required: true });
    if (!result.valid) return result;
    if (result.value === undefined) return { valid: false, message: "githubUrl is required" };
    return { valid: true, value: result.value };
  },
  demoUrl: (v) => validateUrl(v, "demoUrl"),
  description: (v) => validateRequiredString(v, "description", { minLength: 10, maxLength: 3000 }),
};
