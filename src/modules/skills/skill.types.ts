export type Proficiency = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface AddUserSkillInput {
  skillId: string;
  proficiency: Proficiency;
}

export interface UpdateUserSkillInput {
  proficiency: Proficiency;
}
