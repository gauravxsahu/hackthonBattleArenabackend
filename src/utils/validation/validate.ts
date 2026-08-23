import { ValidationErrorCollector } from "./errors";
import type { ValidationResult } from "./validators";

/**
 * A "rule" maps a field name in the source object to a validator function
 * that receives the raw value and returns a ValidationResult.
 *
 * Example:
 *   const schema: Schema<RegisterInput> = {
 *     name: (v) => validateRequiredString(v, "name", { minLength: 2 }),
 *     email: (v) => validateEmail(v),
 *     password: (v) => validatePassword(v),
 *   };
 *   const data = runValidation(req.body, schema);
 */
export type Rule<T> = (value: unknown) => ValidationResult<T>;
export type Schema<T extends object> = {
  [K in keyof T]: Rule<T[K]>;
};

export function runValidation<T extends object>(
  source: Record<string, unknown> | undefined | null,
  schema: Schema<T>
): T {
  const collector = new ValidationErrorCollector();
  const result = {} as T;
  const input: Record<string, unknown> = source ?? {};

  for (const key of Object.keys(schema) as (keyof T)[]) {
    const rule = schema[key];
    const raw = input[key as string];
    const validated = rule(raw);
    if (validated.valid) {
      result[key] = validated.value;
    } else {
      collector.add(String(key), validated.message);
    }
  }

  collector.throwIfAny("Validation failed");
  return result;
}

/** Validates a single value on the fly (used for route params, ad-hoc checks). */
export function runOne<T>(value: unknown, rule: Rule<T>, field = "field"): T {
  const result = rule(value);
  if (!result.valid) {
    const collector = new ValidationErrorCollector();
    collector.add(field, result.message);
    collector.throwIfAny("Validation failed");
  }
  return (result as { valid: true; value: T }).value;
}
