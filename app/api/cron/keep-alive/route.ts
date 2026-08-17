import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps the hosted Postgres from auto-pausing.
 *
 * Supabase free-tier projects pause after roughly a week without activity. When
 * that happens the connection pooler tears down its tenant mapping, so every
 * query fails with `tenant/user ... not found` and the whole portal goes down
 * until somebody restores the project by hand. That already happened once.
 *
 * A single trivial query per day is enough to count as activity. Scheduled from
 * `vercel.json`; Vercel's free plan permits one cron run per day, comfortably
 * inside the idle window.
 *
 * Protected by CRON_SECRET when set — Vercel sends it as a bearer token — so the
 * endpoint cannot be used by anyone else to keep a paused project awake.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (error) {
    // Report the failure so a failing cron is visible in Vercel's logs rather
    // than silently doing nothing for weeks.
    console.error("[cron/keep-alive] database ping failed", error);
    return NextResponse.json(
      { ok: false, error: "Database unreachable" },
      { status: 503 },
    );
  }
}
