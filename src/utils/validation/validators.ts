/**
 * Reusable, dependency-free field validators.
 *
 * Every validator returns either:
 *   { valid: true, value: T }
 * or
 *   { valid: false, message: string }
 *
 * This shape lets callers (validate.ts / individual module validation.ts
 * files) compose validators without throwing on every single field, so all
 * errors for a request body can be collected at once.
 */

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; message: string };

const ok = <T>(value: T): ValidationResult<T> => ({ valid: true, value });
const fail = (message: string): ValidationResult<never> => ({ valid: false, message });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Reasonably strict but not overbearing: at least 8 chars, one letter, one number.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function validateRequired(value: unknown, field = "field"): ValidationResult<unknown> {
  if (!isPresent(value)) return fail(`${field} is required`);
  return ok(value);
}

export function validateRequiredString(
  value: unknown,
  field = "field",
  opts: { minLength?: number; maxLength?: number } = {}
): ValidationResult<string> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fail(`${field} must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (opts.minLength !== undefined && trimmed.length < opts.minLength) {
    return fail(`${field} must be at least ${opts.minLength} characters`);
  }
  if (opts.maxLength !== undefined && trimmed.length > opts.maxLength) {
    return fail(`${field} must be at most ${opts.maxLength} characters`);
  }
  return ok(trimmed);
}

export function validateOptionalString(
  value: unknown,
  field = "field",
  opts: { maxLength?: number } = {}
): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === "") return ok(undefined);
  if (typeof value !== "string") return fail(`${field} must be a string`);
  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    return fail(`${field} must be at most ${opts.maxLength} characters`);
  }
  return ok(value);
}

export function validateNumber(
  value: unknown,
  field = "field",
  opts: { min?: number; max?: number; integer?: boolean } = {}
): ValidationResult<number> {
  const num = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof num !== "number" || Number.isNaN(num)) {
    return fail(`${field} must be a number`);
  }
  if (opts.integer && !Number.isInteger(num)) {
    return fail(`${field} must be an integer`);
  }
  if (opts.min !== undefined && num < opts.min) {
    return fail(`${field} must be >= ${opts.min}`);
  }
  if (opts.max !== undefined && num > opts.max) {
    return fail(`${field} must be <= ${opts.max}`);
  }
  return ok(num);
}

export function validateBoolean(value: unknown, field = "field"): ValidationResult<boolean> {
  if (typeof value === "boolean") return ok(value);
  if (value === "true") return ok(true);
  if (value === "false") return ok(false);
  return fail(`${field} must be a boolean`);
}

export function validateEmail(value: unknown, field = "email"): ValidationResult<string> {
  if (typeof value !== "string" || !EMAIL_REGEX.test(value.trim())) {
    return fail(`${field} must be a valid email address`);
  }
  return ok(value.trim().toLowerCase());
}

export function validatePassword(value: unknown, field = "password"): ValidationResult<string> {
  if (typeof value !== "string" || !PASSWORD_REGEX.test(value)) {
    return fail(`${field} must be 8-72 characters and include at least one letter and one number`);
  }
  return ok(value);
}

export function validateUrl(value: unknown, field = "field", opts: { required?: boolean } = {}): ValidationResult<string | undefined> {
  if (!isPresent(value)) {
    if (opts.required) return fail(`${field} is required`);
    return ok(undefined);
  }
  if (typeof value !== "string") return fail(`${field} must be a string URL`);
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return fail(`${field} must use http or https`);
    }
    return ok(value);
  } catch {
    return fail(`${field} must be a valid URL`);
  }
}

export function validateGithubUrl(value: unknown, field = "githubUrl", opts: { required?: boolean } = {}): ValidationResult<string | undefined> {
  const base = validateUrl(value, field, opts);
  if (!base.valid) return base;
  if (base.value === undefined) return base;
  if (!/^https?:\/\/(www\.)?github\.com\//i.test(base.value)) {
    return fail(`${field} must be a github.com URL`);
  }
  return base;
}

export function validateUuid(value: unknown, field = "id"): ValidationResult<string> {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    return fail(`${field} must be a valid UUID`);
  }
  return ok(value);
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field = "field"
): ValidationResult<T> {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return fail(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return ok(value as T);
}

export function validateArray<T>(
  value: unknown,
  field = "field",
  opts: { minLength?: number; maxLength?: number; itemValidator?: (item: unknown, index: number) => ValidationResult<T> } = {}
): ValidationResult<T[]> {
  if (!Array.isArray(value)) return fail(`${field} must be an array`);
  if (opts.minLength !== undefined && value.length < opts.minLength) {
    return fail(`${field} must contain at least ${opts.minLength} item(s)`);
  }
  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    return fail(`${field} must contain at most ${opts.maxLength} item(s)`);
  }
  if (opts.itemValidator) {
    const results: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const r = opts.itemValidator(value[i], i);
      if (!r.valid) return fail(`${field}[${i}]: ${r.message}`);
      results.push(r.value);
    }
    return ok(results);
  }
  return ok(value as T[]);
}

export function validateObject(value: unknown, field = "field"): ValidationResult<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${field} must be an object`);
  }
  return ok(value as Record<string, unknown>);
}

export function validateStringArray(value: unknown, field = "field", opts: { maxLength?: number } = {}): ValidationResult<string[]> {
  return validateArray<string>(value, field, {
    maxLength: opts.maxLength,
    itemValidator: (item, i) => validateRequiredString(item, `${field}[${i}]`),
  });
}
