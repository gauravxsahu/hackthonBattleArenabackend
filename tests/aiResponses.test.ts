import { describe, expect, test } from "bun:test";
import { validateChallengeResponse, validateAIEvaluationResponse } from "../src/utils/validation/aiResponses";
import { ValidationError } from "../src/utils/validation/errors";

const validChallenge = {
  title: "AI Task Manager",
  description: "Build a task manager with AI prioritization.",
  difficulty: "INTERMEDIATE",
  requirements: ["Authentication", "Create tasks", "Update tasks", "Dashboard"],
  bonusRequirements: ["AI task prioritization"],
  evaluationCriteria: {
    functionality: 30,
    codeQuality: 20,
    innovation: 20,
    ui: 15,
    performance: 15,
  },
};

describe("validateChallengeResponse", () => {
  test("accepts a well-formed challenge", () => {
    const result = validateChallengeResponse(validChallenge);
    expect(result.title).toBe("AI Task Manager");
    expect(result.evaluationCriteria.functionality).toBe(30);
  });

  test("rejects missing required fields", () => {
    const { title: _title, ...missingTitle } = validChallenge;
    expect(() => validateChallengeResponse(missingTitle)).toThrow(ValidationError);
  });

  test("rejects an invalid difficulty enum", () => {
    expect(() => validateChallengeResponse({ ...validChallenge, difficulty: "GODLIKE" })).toThrow(ValidationError);
  });

  test("rejects evaluationCriteria that doesn't sum to 100", () => {
    expect(() =>
      validateChallengeResponse({
        ...validChallenge,
        evaluationCriteria: { functionality: 10, codeQuality: 10, innovation: 10, ui: 10, performance: 10 },
      })
    ).toThrow(ValidationError);
  });

  test("rejects a non-array requirements field", () => {
    expect(() => validateChallengeResponse({ ...validChallenge, requirements: "not an array" })).toThrow(ValidationError);
  });
});

describe("validateAIEvaluationResponse", () => {
  const validEvaluation = {
    functionality: 27,
    codeQuality: 15,
    innovation: 14,
    ui: 8,
    performance: 8,
    total: 72,
    feedback: ["Authentication works correctly", "Dashboard is incomplete"],
  };

  test("accepts a well-formed evaluation", () => {
    const result = validateAIEvaluationResponse(validEvaluation);
    expect(result.total).toBe(72);
  });

  test("rejects when total doesn't match the sum of parts", () => {
    expect(() => validateAIEvaluationResponse({ ...validEvaluation, total: 5 })).toThrow(ValidationError);
  });

  test("rejects non-numeric scores", () => {
    expect(() => validateAIEvaluationResponse({ ...validEvaluation, functionality: "high" })).toThrow(ValidationError);
  });
});
