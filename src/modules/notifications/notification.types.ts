export type NotificationType = "MATCH_FOUND" | "GAME_STARTED" | "GAME_ENDED" | "BADGE_AWARDED";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  message: string;
  data?: Record<string, unknown>;
}
