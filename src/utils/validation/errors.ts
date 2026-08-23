/**
 * Centralized application error types.
 * Every error thrown anywhere in the app should be (or extend) AppError so
 * the global error handler can produce a consistent response shape:
 *
 *   { success: false, message: string, code: string, details?: unknown }
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: FieldError[]) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, 409, code);
    this.name = "ConflictError";
  }
}

export interface FieldError {
  field: string;
  message: string;
}

/** Aggregates multiple field-level failures into a single ValidationError. */
export class ValidationErrorCollector {
  private errors: FieldError[] = [];

  add(field: string, message: string) {
    this.errors.push({ field, message });
  }

  get hasErrors() {
    return this.errors.length > 0;
  }

  throwIfAny(message = "Validation failed") {
    if (this.hasErrors) {
      throw new ValidationError(message, this.errors);
    }
  }

  getErrors() {
    return this.errors;
  }
}
