import { ValidationError } from "./errors";
import {
  validateArray,
  validateEnum,
  validateNumber,
  validateObject,
  validateRequiredString,
} from "./validators";

const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export interface EvaluationCriteria {
  functionality: number;
  codeQuality: number;
  innovation: number;
  ui: number;
  performance: number;
}

export interface AIChallengeResponse {
  title: string;
  description: string;
  difficulty: (typeof DIFFICULTIES)[number];
  requirements: string[];
  bonusRequirements: string[];
  evaluationCriteria: EvaluationCriteria;
  starterCode?: string;
}

/**
 * Validates the raw JSON returned by the AI challenge generator.
 * Deliberately hand-rolled (no Zod) per project requirements.
 */
export function validateChallengeResponse(raw: unknown): AIChallengeResponse {
  const objResult = validateObject(raw, "challenge");
  if (!objResult.valid) {
    throw new ValidationError("AI challenge response must be a JSON object");
  }
  const obj = objResult.value;

  const title = validateRequiredString(obj.title, "title", { maxLength: 200 });
  const description = validateRequiredString(obj.description, "description", { maxLength: 5000 });
  const difficulty = validateEnum(obj.difficulty, DIFFICULTIES, "difficulty");
  const requirements = validateArray<string>(obj.requirements, "requirements", {
    minLength: 1,
    itemValidator: (item, i) => validateRequiredString(item, `requirements[${i}]`),
  });
  const bonusRequirements = validateArray<string>(obj.bonusRequirements, "bonusRequirements", {
    itemValidator: (item, i) => validateRequiredString(item, `bonusRequirements[${i}]`),
  });

  if (!title.valid) throw new ValidationError(title.message);
  if (!description.valid) throw new ValidationError(description.message);
  if (!difficulty.valid) throw new ValidationError(difficulty.message);
  if (!requirements.valid) throw new ValidationError(requirements.message);
  if (!bonusRequirements.valid) throw new ValidationError(bonusRequirements.message);

  const evaluationCriteria = validateEvaluationCriteria(obj.evaluationCriteria, true);

  // starterCode is only expected for BUG_FIX-mode generations — optional
  // everywhere else, but if present it must actually be a non-empty string.
  let starterCode: string | undefined;
  if (obj.starterCode !== undefined && obj.starterCode !== null) {
    const starterCodeResult = validateRequiredString(obj.starterCode, "starterCode", { maxLength: 20000 });
    if (!starterCodeResult.valid) throw new ValidationError(starterCodeResult.message);
    starterCode = starterCodeResult.value;
  }

  return {
    title: title.value,
    description: description.value,
    difficulty: difficulty.value,
    requirements: requirements.value,
    bonusRequirements: bonusRequirements.value,
    evaluationCriteria,
    ...(starterCode !== undefined ? { starterCode } : {}),
  };
}

function validateEvaluationCriteria(raw: unknown, mustSumTo100: boolean): EvaluationCriteria {
  const objResult = validateObject(raw, "evaluationCriteria");
  if (!objResult.valid) {
    throw new ValidationError("evaluationCriteria must be a JSON object");
  }
  const obj = objResult.value;
  const fields = ["functionality", "codeQuality", "innovation", "ui", "performance"] as const;

  const values: Partial<EvaluationCriteria> = {};
  for (const field of fields) {
    const result = validateNumber(obj[field], `evaluationCriteria.${field}`, { min: 0, max: 100 });
    if (!result.valid) throw new ValidationError(result.message);
    values[field] = result.value;
  }

  if (mustSumTo100) {
    const sum = fields.reduce((acc, f) => acc + (values[f] as number), 0);
    if (sum !== 100) {
      throw new ValidationError(`evaluationCriteria values must sum to 100 (got ${sum})`);
    }
  }

  return values as EvaluationCriteria;
}

export interface AIEvaluationResponse {
  functionality: number;
  codeQuality: number;
  innovation: number;
  ui: number;
  performance: number;
  total: number;
  feedback: string[];
}

/**
 * Validates the raw JSON returned by the AI evaluation service.
 */
export function validateAIEvaluationResponse(raw: unknown): AIEvaluationResponse {
  const objResult = validateObject(raw, "evaluation");
  if (!objResult.valid) {
    throw new ValidationError("AI evaluation response must be a JSON object");
  }
  const obj = objResult.value;
  const numericFields = ["functionality", "codeQuality", "innovation", "ui", "performance", "total"] as const;

  const values: Record<string, number> = {};
  for (const field of numericFields) {
    const result = validateNumber(obj[field], field, { min: 0, max: 100 });
    if (!result.valid) throw new ValidationError(result.message);
    values[field] = result.value;
  }

  const feedback = validateArray<string>(obj.feedback, "feedback", {
    itemValidator: (item, i) => validateRequiredString(item, `feedback[${i}]`),
  });
  if (!feedback.valid) throw new ValidationError(feedback.message);

  const computedTotal = values.functionality + values.codeQuality + values.innovation + values.ui + values.performance;
  // Allow small rounding drift from the AI (+/-1) but reject anything wildly off.
  if (Math.abs(computedTotal - values.total) > 1.5) {
    throw new ValidationError(
      `evaluation total (${values.total}) does not match the sum of its parts (${computedTotal})`
    );
  }

  return {
    functionality: values.functionality,
    codeQuality: values.codeQuality,
    innovation: values.innovation,
    ui: values.ui,
    performance: values.performance,
    total: values.total,
    feedback: feedback.value,
  };
}
