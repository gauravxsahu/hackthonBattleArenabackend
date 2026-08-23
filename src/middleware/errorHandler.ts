import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/validation/errors";
import { logger } from "../utils/logger";

/** 404 handler for unmatched routes — must be registered after all routes. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
}

/** Global error handler — must be registered last, with 4 args, for Express to recognize it. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, stack: err.stack });
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  logger.error("Unhandled error", { message, stack: err instanceof Error ? err.stack : undefined });

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

/** Wraps an async route handler so rejected promises reach errorHandler. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Req, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
