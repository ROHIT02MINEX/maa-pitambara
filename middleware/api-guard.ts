import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { limitByIp } from "@/lib/rate-limit";

export type GuardedContext = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
  };
};

export type RouteHandler = (
  req: NextRequest,
  ctx: GuardedContext,
) => Promise<Response> | Response;

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Rejects cross-site requests to mutating API routes. Server Actions have this
 * built in; plain route handlers do not, so we verify the Origin header.
 */
export function assertSameOrigin(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

type GuardOptions = {
  requireRole?: Role;
  rateLimit?: { action: string; limit: number; windowMs: number };
  /** Set to false for read-only handlers that may be called cross-origin. */
  csrf?: boolean;
};

/**
 * Wraps a route handler with authentication, optional role check, CSRF origin
 * validation and rate limiting.
 */
export function guard(handler: RouteHandler, options: GuardOptions = {}) {
  return async (req: NextRequest) => {
    const { requireRole, rateLimit, csrf = true } = options;

    if (csrf && !assertSameOrigin(req)) {
      return jsonError("Invalid request origin", 403);
    }

    if (rateLimit) {
      const result = await limitByIp(rateLimit.action, rateLimit.limit, rateLimit.windowMs);
      if (!result.success) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
        );
      }
    }

    const session = await auth();
    const user = session?.user;
    if (!user?.id || !user.email) return jsonError("Unauthorized", 401);
    if (requireRole && user.role !== requireRole) return jsonError("Forbidden", 403);

    return handler(req, {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  };
}

export function adminGuard(
  handler: RouteHandler,
  options: Omit<GuardOptions, "requireRole"> = {},
) {
  return guard(handler, { ...options, requireRole: Role.ADMIN });
}
