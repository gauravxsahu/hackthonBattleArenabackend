import { ValidationError } from "../../utils/validation/errors";
import { isValidGameMode, type GameMode } from "../../config/gameModes";

/** Battle and Bug-Fix are the only modes that go through this queue-based module. */
const QUEUEABLE_MODES = ["BATTLE", "BUG_FIX"] as const;

export function parseQueueableMode(raw: unknown): GameMode {
  const mode = typeof raw === "string" && raw.length > 0 ? raw.toUpperCase() : "BATTLE";
  if (!isValidGameMode(mode) || !(QUEUEABLE_MODES as readonly string[]).includes(mode)) {
    throw new ValidationError(`mode must be one of: ${QUEUEABLE_MODES.join(", ")}`);
  }
  return mode;
}
