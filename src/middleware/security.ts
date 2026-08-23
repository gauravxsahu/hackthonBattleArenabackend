
import cors from "cors";

import helmet from "helmet";

import rateLimit from "express-rate-limit";

import { env } from "../config/env";

export const corsMiddleware = cors({
  origin: env.clientUrl,
  credentials: true,
});

export const helmetMiddleware = helmet();

/** General API rate limit. */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMITED",
  },
});

/**
 * Auth rate limit.
 * Higher limit for local development/testing so multiple test users
 * can register/login from the same localhost IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth attempts, please try again later",
    code: "RATE_LIMITED",
  },
});
