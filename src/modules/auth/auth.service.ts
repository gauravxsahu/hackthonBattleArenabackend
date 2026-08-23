import { createHash, randomUUID } from "crypto";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { ConflictError, UnauthorizedError } from "../../utils/validation/errors";
import { authRepository } from "./auth.repository";
import type { LoginInput, PublicUser, RegisterInput } from "./auth.types";
import { env } from "../../config/env";

function toPublicUser(user: {
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
}): PublicUser {
  // Explicit allow-list so passwordHash and other internals never leak.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    rating: user.rating,
    coins: user.coins,
    xp: user.xp,
    wins: user.wins,
    losses: user.losses,
    createdAt: user.createdAt,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate(): Date {
  const match = /^(\d+)([dhm])$/.exec(env.jwtRefreshExpiresIn);
  const amount = match ? Number(match[1]) : 7;
  const unit = match ? match[2] : "d";
  const ms = unit === "d" ? amount * 86_400_000 : unit === "h" ? amount * 3_600_000 : amount * 60_000;
  return new Date(Date.now() + ms);
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists", "EMAIL_TAKEN");
    }
    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({ name: input.name, email: input.email, passwordHash });
    return this.issueTokens(user.id, user.role);
  },

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");
    const tokens = await this.issueTokens(user.id, user.role);
    return { ...tokens, user: toPublicUser(user) };
  },

  async issueTokens(userId: string, role: "PLAYER" | "ADMIN") {
    const tokenId = randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, tokenId });
    await authRepository.storeRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    });
    const accessToken = signAccessToken({ sub: userId, role });
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await authRepository.findRefreshTokenByHash(hashToken(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token is no longer valid");
    }
    // Rotate: revoke the used token and issue a fresh pair.
    await authRepository.revokeRefreshToken(stored.id);
    const user = await authRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError("User no longer exists");
    return this.issueTokens(user.id, user.role);
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const stored = await authRepository.findRefreshTokenByHash(hashToken(refreshToken));
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new UnauthorizedError("User no longer exists");
    return toPublicUser(user);
  },
};
