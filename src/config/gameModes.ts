import { env } from "./env";

/**
 * Central per-GameMode configuration. Anything that varies by mode (how
 * many players, how long the timer runs, which matchmaking queue to use)
 * is looked up from here so the rest of the codebase never hardcodes a
 * mode's rules inline.
 */
export type GameMode = "BATTLE" | "BUG_FIX" | "PRACTICE" | "FRIEND_CHALLENGE";

export interface GameModeConfig {
  /** Total players needed to form a match (both teams combined). */
  playersRequired: number;
  /** Players per team. */
  teamSize: number;
  /** Build timer length, in minutes. */
  durationMinutes: number;
  /** Whether this mode goes through the Redis matchmaking queue at all. */
  usesQueue: boolean;
}

export const GAME_MODE_CONFIG: Record<GameMode, GameModeConfig> = {
  BATTLE: {
    playersRequired: env.matchPlayersRequired, // configurable via .env (currently 2v2 = 4)
    teamSize: env.matchTeamSize,
    durationMinutes: env.gameDurationMinutes, // configurable via .env (default 30)
    usesQueue: true,
  },
  BUG_FIX: {
    playersRequired: 2, // 1v1 duel
    teamSize: 1,
    durationMinutes: 15,
    usesQueue: true,
  },
  PRACTICE: {
    playersRequired: 1, // solo — no opponent, no queue
    teamSize: 1,
    durationMinutes: env.gameDurationMinutes,
    usesQueue: false,
  },
  FRIEND_CHALLENGE: {
    playersRequired: 2, // 1v1, but paired via invite code instead of the queue
    teamSize: 1,
    durationMinutes: 15,
    usesQueue: false,
  },
};

export function isValidGameMode(value: unknown): value is GameMode {
  return typeof value === "string" && value in GAME_MODE_CONFIG;
}
