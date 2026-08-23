import { logger } from "../../utils/logger";
import type { NotificationPayload } from "./notification.types";

/**
 * Lightweight notification dispatcher. There's no persisted Notification
 * model in this iteration (not in the spec's model list) — this exists as
 * a single seam other modules call into, so a real delivery mechanism
 * (push/email/in-app feed + table) can be dropped in later without callers
 * changing. For now, delivery happens purely over the existing Socket.IO
 * connection for that user, if sockets/index.ts has registered a sender.
 */

type Sender = (payload: NotificationPayload) => void;

let sender: Sender | null = null;

export const notificationService = {
  registerSender(fn: Sender) {
    sender = fn;
  },

  notify(payload: NotificationPayload) {
    if (sender) {
      sender(payload);
    } else {
      logger.debug("Notification dropped (no sender registered)", { payload });
    }
  },
};
