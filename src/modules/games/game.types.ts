export type GameStatus =
  | "WAITING"
  | "TEAM_FORMING"
  | "READY"
  | "RUNNING"
  | "SUBMISSION"
  | "EVALUATING"
  | "COMPLETED"
  | "CANCELLED";

export interface FormedTeamInput {
  side: "TEAM_A" | "TEAM_B";
  userIds: string[];
}
