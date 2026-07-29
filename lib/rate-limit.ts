import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window rate limiter held in module scope.
 *
 * This protects a single server instance; on a horizontally scaled deployment
 * each instance keeps its own window, which is still an effective brake on
 * credential stuffing and scripted abuse. Swap `store` for Redis/Upstash by
 * re-implementing `rateLimit` — every call site uses the same signature.
 */
const store = new Map<string, Bucket>();

/** Evict expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (store.size < 5_000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    success: bucket.count <= limit,
    limit,
    remaining,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Clear a bucket after a successful action (e.g. a correct login). */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Best-effort client IP from proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

/**
 * Convenience wrapper: limits by IP for a named action.
 *
 * Training centres usually sit behind a single NAT address, so IP buckets are
 * deliberately generous — they exist to stop scripted abuse, not to throttle a
 * classroom. Anything that identifies a specific account or user is limited
 * with `limitByKey`/`limitByIdentifier` instead, which is where the tight
 * limits belong.
 */
export async function limitByIp(action: string, limit: number, windowMs: number) {
  const ip = await clientIp();
  return rateLimit(`${action}:ip:${ip}`, limit, windowMs);
}

/** Limit by an application-level identity (user id, e-mail, …). */
export function limitByKey(action: string, identity: string, limit: number, windowMs: number) {
  return rateLimit(`${action}:id:${identity.toLowerCase()}`, limit, windowMs);
}

/**
 * Applies both the per-identity and the per-IP bucket and returns whichever
 * fails first. Used by the credential flows.
 */
export async function limitByIdentifier(
  action: string,
  identity: string,
  perIdentity: { limit: number; windowMs: number },
  perIp: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const identityResult = limitByKey(action, identity, perIdentity.limit, perIdentity.windowMs);
  if (!identityResult.success) return identityResult;
  return limitByIp(action, perIp.limit, perIp.windowMs);
}

export const RATE_LIMITS = {
  // Per-account limits — tight, because they target one identity.
  login: { limit: 8, windowMs: 5 * 60 * 1000 },
  register: { limit: 3, windowMs: 15 * 60 * 1000 },
  forgotPassword: { limit: 3, windowMs: 15 * 60 * 1000 },
  resetPassword: { limit: 6, windowMs: 15 * 60 * 1000 },
  resendVerification: { limit: 3, windowMs: 10 * 60 * 1000 },
  // Per-user limits.
  startTest: { limit: 10, windowMs: 10 * 60 * 1000 },
  saveAnswer: { limit: 600, windowMs: 10 * 60 * 1000 },
  mutation: { limit: 120, windowMs: 5 * 60 * 1000 },
  upload: { limit: 30, windowMs: 10 * 60 * 1000 },
  export: { limit: 20, windowMs: 10 * 60 * 1000 },
  // Shared-network ceilings — high enough for a full computer lab.
  ipAuth: { limit: 120, windowMs: 5 * 60 * 1000 },
  ipMutation: { limit: 600, windowMs: 5 * 60 * 1000 },
} as const;
