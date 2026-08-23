/**
 * Central place that reads and validates process.env (Bun auto-loads .env).
 * Nothing else in the app should call process.env directly.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  clientUrl: optional("CLIENT_URL", "http://localhost:3000"),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),

  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),

  aiApiKey: optional("AI_API_KEY", ""),
  aiApiUrl: optional("AI_API_URL", "https://api.openai.com/v1/chat/completions"),
  aiModel: optional("AI_MODEL", "gpt-4o-mini"),

  gameDurationMinutes: Number(optional("GAME_DURATION_MINUTES", "30")),
  matchTeamSize: Number(optional("MATCH_TEAM_SIZE", "2")),
  matchPlayersRequired: Number(optional("MATCH_PLAYERS_REQUIRED", "4")),

  isProduction: optional("NODE_ENV", "development") === "production",
};
