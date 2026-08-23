/**
 * SkillScoringService
 *
 * Turns a player's raw skill list into scores TeamFormationService can use
 * to balance teams on more than just rating: experience level and how well
 * the team's combined skills cover common hackathon "roles" (frontend,
 * backend, AI/ML, devops, mobile, design).
 */

export interface PlayerSkillProfile {
  userId: string;
  rating: number;
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  skills: { name: string; proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }[];
}

const EXPERIENCE_WEIGHT: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

// Rough keyword buckets to approximate a "role" from a free-text skill name.
const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["react", "vue", "angular", "css", "html", "frontend", "next.js", "svelte", "ui"],
  backend: ["node", "express", "django", "spring", "backend", "api", "golang", "rails", "postgres", "sql"],
  ai: ["python", "tensorflow", "pytorch", "ai", "ml", "machine learning", "llm", "nlp"],
  devops: ["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "devops", "terraform"],
  mobile: ["swift", "kotlin", "flutter", "react native", "android", "ios", "mobile"],
  design: ["figma", "design", "ux", "ui/ux", "photoshop"],
};

export const skillScoringService = {
  /** Experience contribution to overall team strength (0-4 scale per player). */
  experienceScore(profile: PlayerSkillProfile): number {
    return EXPERIENCE_WEIGHT[profile.experienceLevel] ?? 1;
  },

  /** Highest proficiency-weighted score per role this player can cover. */
  roleCoverage(profile: PlayerSkillProfile): Record<string, number> {
    const coverage: Record<string, number> = {};
    for (const role of Object.keys(ROLE_KEYWORDS)) coverage[role] = 0;

    for (const skill of profile.skills) {
      const lowerName = skill.name.toLowerCase();
      const weight = EXPERIENCE_WEIGHT[skill.proficiency] ?? 1;
      for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
        if (keywords.some((k) => lowerName.includes(k))) {
          coverage[role] = Math.max(coverage[role], weight);
        }
      }
    }
    return coverage;
  },

  /** Combined role coverage for an entire team (max per role across members). */
  teamRoleCoverage(team: PlayerSkillProfile[]): Record<string, number> {
    const combined: Record<string, number> = {};
    for (const role of Object.keys(ROLE_KEYWORDS)) combined[role] = 0;
    for (const player of team) {
      const coverage = this.roleCoverage(player);
      for (const role of Object.keys(ROLE_KEYWORDS)) {
        combined[role] = Math.max(combined[role], coverage[role]);
      }
    }
    return combined;
  },

  /** How many distinct roles (out of 5) a team has at least some coverage for. */
  teamRoleBreadth(team: PlayerSkillProfile[]): number {
    const coverage = this.teamRoleCoverage(team);
    return Object.values(coverage).filter((v) => v > 0).length;
  },

  /** Overall team strength: average rating + a small experience bonus. */
  teamStrength(team: PlayerSkillProfile[]): number {
    if (team.length === 0) return 0;
    const avgRating = team.reduce((sum, p) => sum + p.rating, 0) / team.length;
    const avgExperience = team.reduce((sum, p) => sum + this.experienceScore(p), 0) / team.length;
    return avgRating + avgExperience * 10;
  },
};
