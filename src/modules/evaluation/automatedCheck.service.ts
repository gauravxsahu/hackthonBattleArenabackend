import { logger } from "../../utils/logger";
import type { AutomatedCheckResult } from "./evaluation.types";

/**
 * AutomatedCheckService
 *
 * A full CI-style "clone and run the repo" pipeline is out of scope for
 * this backend (no online IDE / sandbox runner per the spec), so this is a
 * clean, swappable interface with a lightweight real implementation:
 *   1. Verify the GitHub repo URL actually resolves (HEAD request).
 *   2. Heuristically check whether the submission's own description
 *      mentions each challenge requirement, as a stand-in for a real
 *      requirement-coverage scan.
 *
 * Replace `checkRequirement` with a real test-runner/webhook integration
 * later without touching any caller of `runChecks`.
 */

async function repoIsReachable(githubUrl: string): Promise<boolean> {
  try {
    const res = await fetch(githubUrl, { method: "HEAD" });
    return res.ok;
  } catch (err) {
    logger.warn("Automated check: could not reach GitHub URL", { githubUrl, error: String(err) });
    return false;
  }
}

function requirementMentioned(requirement: string, description: string): boolean {
  const keywords = requirement
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (keywords.length === 0) return true;
  const lowerDescription = description.toLowerCase();
  const hits = keywords.filter((k) => lowerDescription.includes(k)).length;
  return hits / keywords.length >= 0.4;
}

export const automatedCheckService = {
  async runChecks(params: {
    githubUrl: string;
    description: string;
    requirements: string[];
  }): Promise<{ results: AutomatedCheckResult[]; score: number }> {
    const reachable = await repoIsReachable(params.githubUrl);

    const results: AutomatedCheckResult[] = [
      {
        requirement: "Repository accessible",
        passed: reachable,
        detail: reachable ? "GitHub URL resolved successfully" : "GitHub URL did not resolve",
      },
      ...params.requirements.map((requirement) => {
        const passed = requirementMentioned(requirement, params.description);
        return {
          requirement,
          passed,
          detail: passed
            ? "Requirement appears to be addressed based on submission description"
            : "No clear evidence of this requirement in the submission description",
        };
      }),
    ];

    const passedCount = results.filter((r) => r.passed).length;
    const score = Math.round((passedCount / results.length) * 100);

    return { results, score };
  },
};
