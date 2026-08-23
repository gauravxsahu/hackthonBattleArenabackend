import type { GameMode } from "../../config/gameModes";

export interface QueueStatus {
  mode: GameMode;
  inQueue: boolean;
  queuePosition: number | null;
  queueSize: number;
  matchedGameId: string | null;
}
