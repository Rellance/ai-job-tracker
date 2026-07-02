import { createHash, randomBytes } from "crypto";

/** Raw token goes to the user (email link); only its hash is stored in the DB. */
export function generateResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
