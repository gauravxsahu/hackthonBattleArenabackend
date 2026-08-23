/**
 * GameTimerService
 *
 * The frontend never dictates when a game ends — this service is the single
 * source of truth. It schedules a Bun-native setTimeout for each running
 * game's endTime and invokes a callback when the deadline passes, so the
 * game service can transition RUNNING -> SUBMISSION -> EVALUATING without
 * trusting any client-reported time.
 *
 * NOTE: timers live in-process (a Map keyed by gameId). That's sufficient
 * for a single-instance deployment as specified; a multi-instance/production
 * deployment would move this to a distributed scheduler (e.g. a Redis-backed
 * delayed job queue) but the interface below would stay the same.
 */

type TimerHandle = ReturnType<typeof setTimeout>;

const activeTimers = new Map<string, TimerHandle>();
const tickIntervals = new Map<string, ReturnType<typeof setInterval>>();

export const gameTimerService = {
  /** Schedules `onExpire` to fire exactly at `endTime` (server clock). */
  scheduleEnd(gameId: string, endTime: Date, onExpire: () => void) {
    this.clear(gameId);
    const delayMs = Math.max(0, endTime.getTime() - Date.now());
    const handle = setTimeout(() => {
      activeTimers.delete(gameId);
      onExpire();
    }, delayMs);
    activeTimers.set(gameId, handle);
  },

  /** Optionally emits a tick every `intervalMs` so sockets can push game:timer updates. */
  startTicking(gameId: string, endTime: Date, intervalMs: number, onTick: (remainingMs: number) => void) {
    this.stopTicking(gameId);
    const interval = setInterval(() => {
      const remaining = endTime.getTime() - Date.now();
      if (remaining <= 0) {
        onTick(0);
        this.stopTicking(gameId);
        return;
      }
      onTick(remaining);
    }, intervalMs);
    tickIntervals.set(gameId, interval);
  },

  stopTicking(gameId: string) {
    const existing = tickIntervals.get(gameId);
    if (existing) {
      clearInterval(existing);
      tickIntervals.delete(gameId);
    }
  },

  clear(gameId: string) {
    const existing = activeTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      activeTimers.delete(gameId);
    }
    this.stopTicking(gameId);
  },

  remainingMs(endTime: Date): number {
    return Math.max(0, endTime.getTime() - Date.now());
  },
};
