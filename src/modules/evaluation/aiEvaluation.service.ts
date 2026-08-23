import { env } from "../../config/env";
import { requestAIJson } from "../../services/aiClient";
import { validateAIEvaluationResponse, type AIEvaluationResponse } from "../../utils/validation/aiResponses";
import { logger } from "../../utils/logger";

const SYSTEM_PROMPT = `You are an impartial hackathon judge. Respond with JSON ONLY, no markdown, matching exactly:
{
  "functionality": number (0-30),
  "codeQuality": number (0-20),
  "innovation": number (0-20),
  "ui": number (0-15),
  "performance": number (0-15),
  "total": number (sum of the above, 0-100),
  "feedback": string[]
}`;

/** Deterministic fallback so evaluation always completes even without a live AI key. */
function mockEvaluation(automatedScore: number): AIEvaluationResponse {
  // Scale a plausible AI score around the automated score so results feel coherent in demos.
  const base = Math.min(100, Math.max(0, automatedScore));
  const functionality = Math.round(base * 0.3);
  const codeQuality = Math.round(base * 0.2);
  const innovation = Math.round(base * 0.2);
  const ui = Math.round(base * 0.15);
  const performance = Math.round(base * 0.15);
  const total = functionality + codeQuality + innovation + ui + performance;
  return {
    functionality,
    codeQuality,
    innovation,
    ui,
    performance,
    total,
    feedback: ["Automated mock evaluation (no AI_API_KEY configured)."],
  };
}

export const aiEvaluationService = {
  async evaluate(params: {
    challengeTitle: string;
    challengeDescription: string;
    requirements: string[];
    submissionDescription: string;
    githubUrl: string;
    demoUrl?: string | null;
    automatedScore: number;
  }): Promise<AIEvaluationResponse> {
    if (!env.aiApiKey) {
      logger.warn("AI_API_KEY not set — using mock evaluation");
      return mockEvaluation(params.automatedScore);
    }

    try {
      const prompt = `Challenge: ${params.challengeTitle}\n${params.challengeDescription}\nRequirements: ${params.requirements.join(", ")}\n\nSubmission description: ${params.submissionDescription}\nGitHub: ${params.githubUrl}\nDemo: ${params.demoUrl ?? "N/A"}\n\nAutomated requirement-check score: ${params.automatedScore}/100.`;
      const raw = await requestAIJson({ system: SYSTEM_PROMPT, prompt });
      return validateAIEvaluationResponse(raw);
    } catch (err) {
      logger.error("AI evaluation failed, falling back to mock", { error: err instanceof Error ? err.message : String(err) });
      return mockEvaluation(params.automatedScore);
    }
  },
};
