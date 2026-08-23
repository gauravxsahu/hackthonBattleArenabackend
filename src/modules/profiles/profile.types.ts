export interface UpdateProfileInput {
  bio?: string;
  avatar?: string;
  experienceLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  githubUrl?: string;
  linkedinUrl?: string;
  preferredTechnologies?: string[];
  interests?: string[];
}
