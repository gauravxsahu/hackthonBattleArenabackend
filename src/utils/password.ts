/**
 * Password hashing via Bun's built-in Bun.password API, which wraps
 * argon2id (default) / bcrypt natively — no npm bcrypt/argon2 native
 * bindings required, which keeps the project fully Bun-runtime-native.
 */

export async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, {
    algorithm: "argon2id",
    memoryCost: 19456, // ~19 MB, OWASP-recommended minimum
    timeCost: 2,
  });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(plain, hash);
  } catch {
    return false;
  }
}
