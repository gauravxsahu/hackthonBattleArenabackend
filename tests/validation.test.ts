import { describe, expect, test } from "bun:test";
import {
  validateEmail,
  validatePassword,
  validateRequiredString,
  validateEnum,
  validateUrl,
  validateArray,
} from "../src/utils/validation/validators";
import { runValidation } from "../src/utils/validation/validate";
import { ValidationError } from "../src/utils/validation/errors";

describe("validators", () => {
  test("validateEmail accepts valid emails", () => {
    const result = validateEmail("test@example.com");
    expect(result.valid).toBe(true);
  });

  test("validateEmail rejects invalid emails", () => {
    const result = validateEmail("not-an-email");
    expect(result.valid).toBe(false);
  });

  test("validatePassword requires letters and numbers", () => {
    expect(validatePassword("alllettersnonums").valid).toBe(false);
    expect(validatePassword("12345678").valid).toBe(false);
    expect(validatePassword("goodPass123").valid).toBe(true);
  });

  test("validateRequiredString enforces length bounds", () => {
    expect(validateRequiredString("ab", "name", { minLength: 3 }).valid).toBe(false);
    expect(validateRequiredString("abcdef", "name", { minLength: 3, maxLength: 5 }).valid).toBe(false);
    expect(validateRequiredString("abc", "name", { minLength: 3, maxLength: 5 }).valid).toBe(true);
  });

  test("validateEnum only accepts listed values", () => {
    const levels = ["BEGINNER", "ADVANCED"] as const;
    expect(validateEnum("BEGINNER", levels).valid).toBe(true);
    expect(validateEnum("EXPERT", levels).valid).toBe(false);
  });

  test("validateUrl rejects non-http(s) protocols", () => {
    expect(validateUrl("https://example.com").valid).toBe(true);
    expect(validateUrl("javascript:alert(1)").valid).toBe(false);
  });

  test("validateArray enforces min/max length and item validation", () => {
    const result = validateArray<string>(["a", "b"], "tags", {
      minLength: 1,
      maxLength: 3,
      itemValidator: (v, i) => validateRequiredString(v, `tags[${i}]`),
    });
    expect(result.valid).toBe(true);

    const tooMany = validateArray<string>(["a", "b", "c", "d"], "tags", { maxLength: 3 });
    expect(tooMany.valid).toBe(false);
  });
});

describe("runValidation", () => {
  test("collects all field errors before throwing", () => {
    const schema = {
      email: (v: unknown) => validateEmail(v),
      password: (v: unknown) => validatePassword(v),
    };

    try {
      runValidation({ email: "bad", password: "123" }, schema);
      throw new Error("expected runValidation to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const validationError = err as ValidationError;
      expect((validationError.details as { field: string }[]).length).toBe(2);
    }
  });

  test("returns normalized values on success", () => {
    const schema = { email: (v: unknown) => validateEmail(v) };
    const result = runValidation<{ email: string }>({ email: "Test@Example.com" }, schema);
    expect(result.email).toBe("test@example.com");
  });
});
