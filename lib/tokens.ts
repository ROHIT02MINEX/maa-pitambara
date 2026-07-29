import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

/** Cryptographically strong, URL-safe token used in e-mail links. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Tokens are stored hashed so a database leak cannot be replayed to take over
 * accounts. The raw token only ever exists inside the e-mail.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
