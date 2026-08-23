import type { NextFunction, Request, Response } from "express";
import { runValidation } from "./validate";
import type { Schema } from "./validate";

/**
 * validateBody / validateQuery / validateParams
 *
 * Each returns Express middleware that validates the relevant part of the
 * request against a Schema (see validate.ts) built from the reusable
 * validators in validators.ts. On success the parsed/normalized value is
 * written back onto req.body / req.query / req.params so downstream
 * controllers can trust the shape. On failure, the ValidationError bubbles
 * to the centralized error handler (see middleware/errorHandler.ts).
 */

export function validateBody<T extends object>(schema: Schema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = runValidation<T>(req.body, schema);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T extends object>(schema: Schema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = runValidation<T>(req.query as Record<string, unknown>, schema);
      (req as unknown as { validatedQuery: T }).validatedQuery = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateParams<T extends object>(schema: Schema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = runValidation<T>(req.params, schema) as unknown as typeof req.params;
      next();
    } catch (err) {
      next(err);
    }
  };
}
