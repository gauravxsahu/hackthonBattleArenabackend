import type { Schema } from "../../utils/validation/validate";
import { validateEmail, validatePassword, validateRequiredString } from "../../utils/validation/validators";
import type { LoginInput, RegisterInput } from "./auth.types";

export const registerSchema: Schema<RegisterInput> = {
  name: (v) => validateRequiredString(v, "name", { minLength: 2, maxLength: 100 }),
  email: (v) => validateEmail(v),
  password: (v) => validatePassword(v),
};

export const loginSchema: Schema<LoginInput> = {
  email: (v) => validateEmail(v),
  password: (v) => validateRequiredString(v, "password"),
};
