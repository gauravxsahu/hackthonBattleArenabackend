export interface AutomatedCheckResult {
  requirement: string;
  passed: boolean;
  detail: string;
}

export interface TeamEvaluationResult {
  teamId: string;
  automatedResults: AutomatedCheckResult[];
  automatedScore: number; // 0-100
  aiResults: {
    functionality: number;
    codeQuality: number;
    innovation: number;
    ui: number;
    performance: number;
    total: number;
    feedback: string[];
  };
  aiScore: number; // 0-100 (the AI's own "total")
  finalScore: number; // automatedScore*0.7 + aiScore*0.3
}

export interface GameEvaluationResult {
  gameId: string;
  teamScores: TeamEvaluationResult[];
  winnerTeamId: string;
}
