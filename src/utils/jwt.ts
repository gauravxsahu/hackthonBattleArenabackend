import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "./validation/errors";
import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  tokenId: string; // matches RefreshToken.id for revocation checks
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}
