import { EventEmitter } from "events";

/**
 * Services publish game lifecycle events here; sockets/gameSocket.ts
 * subscribes and re-broadcasts them into the relevant `game:<gameId>`
 * Socket.IO room. This keeps module services free of a direct Socket.IO
 * dependency (no circular imports between modules/games and sockets/).
 */

export interface GameEventMap {
  "game:start": { gameId: string; startTime: string; endTime: string };
  "game:timer": { gameId: string; remainingMs: number };
  "game:submission-phase": { gameId: string };
  "game:evaluating": { gameId: string };
  "game:end": { gameId: string; winnerTeamId: string | null };
  "game:result": { gameId: string; result: unknown };
  "game:player-status": { gameId: string; userId: string; isReady: boolean };
  "matchmaking:matched": { gameId: string; userIds: string[] };
  "game:cancelled": { gameId: string; reason: string; notReadyUserIds: string[] };
}

class TypedEventEmitter extends EventEmitter {
  emitTyped<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]) {
    this.emit(event, payload);
  }
  onTyped<K extends keyof GameEventMap>(event: K, listener: (payload: GameEventMap[K]) => void) {
    this.on(event, listener);
  }
}

export const gameEvents = new TypedEventEmitter();
gameEvents.setMaxListeners(50);