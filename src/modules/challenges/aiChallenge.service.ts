import { env } from "../../config/env";
import { requestAIJson } from "../../services/aiClient";
import { validateChallengeResponse, type AIChallengeResponse } from "../../utils/validation/aiResponses";
import { logger } from "../../utils/logger";
import type { GenerateChallengeInput } from "./challenge.types";

const BUILD_SYSTEM_PROMPT = `You are a hackathon challenge generator for a competitive coding platform.
Respond with JSON ONLY, no markdown, no commentary, matching exactly this shape:
{
  "title": string,
  "description": string,
  "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
  "requirements": string[],
  "bonusRequirements": string[],
  "evaluationCriteria": {
    "functionality": number,
    "codeQuality": number,
    "innovation": number,
    "ui": number,
    "performance": number
  }
}
The five evaluationCriteria values MUST sum to exactly 100.
The challenge must be solvable by the given number of players within the given duration.`;

const BUG_FIX_SYSTEM_PROMPT = `You are a hackathon "bug hunt" challenge generator for a competitive coding platform.
Respond with JSON ONLY, no markdown, no commentary, matching exactly this shape:
{
  "title": string,
  "description": string,
  "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
  "requirements": string[],
  "bonusRequirements": string[],
  "evaluationCriteria": {
    "functionality": number,
    "codeQuality": number,
    "innovation": number,
    "ui": number,
    "performance": number
  },
  "starterCode": string
}
"starterCode" must be a short, runnable code snippet (plain text, use \\n for newlines) in a
common language matching the given skills, containing exactly 3 to 5 clearly-scoped but
non-obvious bugs (logic errors, off-by-one errors, broken conditionals, incorrect API usage —
NOT syntax errors that would fail to even parse).
"requirements" must describe the bugs at a hint level without giving away the exact fix, e.g.
"Authentication check has a logic error that lets any password through",
"Pagination is off by one on the last page".
The five evaluationCriteria values MUST sum to exactly 100.
The whole thing must be fixable by the given number of players within the given duration.`;

/**
 * Deterministic, dependency-free fallback used when no AI_API_KEY is
 * configured (e.g. local dev, CI) or if the AI call fails. Keeps the
 * platform demoable end-to-end without a live external integration, per
 * "create a clean service interface and mock implementation that can later
 * be replaced."
 */
function mockBuildChallenge(input: GenerateChallengeInput): AIChallengeResponse {
  const skillList = input.skills.length > 0 ? input.skills.join(", ") : "general web development";
  return {
    title: `${input.teamLevel === "BEGINNER" ? "Starter" : input.teamLevel === "EXPERT" ? "Elite" : "Rapid"} Build Sprint`,
    description: `Build a small working application using ${skillList} within ${input.duration} minutes. Focus on a working end-to-end flow over polish.`,
    difficulty: input.teamLevel,
    requirements: [
      "User authentication (sign up / log in)",
      "Core CRUD flow for the app's main entity",
      "A working dashboard or main view",
      "Deployed or runnable demo",
    ],
    bonusRequirements: ["Add one AI-powered feature", "Add basic tests"],
    evaluationCriteria: {
      functionality: 30,
      codeQuality: 20,
      innovation: 20,
      ui: 15,
      performance: 15,
    },
  };
}

const MOCK_STARTER_CODE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}

function isValidPassword(password) {
  if (password.length > 8) {
    return true;
  }
  return true;
}

function paginate(items, pageSize, page) {
  const start = page * pageSize;
  return items.slice(start, start + pageSize - 1);
}`;

function mockBugFixChallenge(input: GenerateChallengeInput): AIChallengeResponse {
  const skillList = input.skills.length > 0 ? input.skills.join(", ") : "JavaScript";
  return {
    title: "Bug Hunt: Broken Checkout Logic",
    description: `A small ${skillList} module has 4 intentional bugs. Find and fix all of them within ${input.duration} minutes.`,
    difficulty: input.teamLevel,
    requirements: [
      "calculateTotal reads one item past the end of the array (off-by-one loop bound)",
      "isValidPassword always returns true regardless of the password's actual length",
      "paginate drops the last item of every page (slice end index is off by one)",
      "Explain each fix briefly in your submission description",
    ],
    bonusRequirements: ["Add a regression test for each bug you fixed"],
    evaluationCriteria: {
      functionality: 30,
      codeQuality: 20,
      innovation: 20,
      ui: 15,
      performance: 15,
    },
    starterCode: MOCK_STARTER_CODE,
  };
}

export const aiChallengeService = {
  async generate(input: GenerateChallengeInput): Promise<AIChallengeResponse> {
    const isBugFix = input.mode === "BUG_FIX";
    const mockFn = isBugFix ? mockBugFixChallenge : mockBuildChallenge;

    if (!env.aiApiKey) {
      logger.warn("AI_API_KEY not set — using mock challenge generator", { mode: input.mode });
      return mockFn(input);
    }

    try {
      const systemPrompt = isBugFix ? BUG_FIX_SYSTEM_PROMPT : BUILD_SYSTEM_PROMPT;
      const prompt = `Generate a ${isBugFix ? "bug-hunt" : "build"} challenge for:\nduration: ${input.duration} minutes\nteamLevel: ${input.teamLevel}\nplayers: ${input.playerCount}\nskills: ${JSON.stringify(input.skills)}`;
      const raw = await requestAIJson({ system: systemPrompt, prompt });
      return validateChallengeResponse(raw);
    } catch (err) {
      logger.error("AI challenge generation failed, falling back to mock", {
        mode: input.mode,
        error: err instanceof Error ? err.message : String(err),
      });
      return mockFn(input);
    }
  },
};
