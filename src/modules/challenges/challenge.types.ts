export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type ChallengeMode = "BATTLE" | "BUG_FIX" | "PRACTICE" | "FRIEND_CHALLENGE";

export interface GenerateChallengeInput {
  duration: number;
  teamLevel: Difficulty;
  skills: string[];
  mode: ChallengeMode;
  /** Number of players who will be solving this (affects scope: solo/1v1 vs 4-player). */
  playerCount: number;
}
