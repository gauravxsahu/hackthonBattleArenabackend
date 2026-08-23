export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  rating: number;
  coins: number;
  xp: number;
  wins: number;
  losses: number;
  createdAt: Date;
}
