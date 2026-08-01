import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic route — added to find out why the deployed function
 * cannot reach the database when the identical connection string works from
 * local dev. Delete this file once the cause is confirmed; it must never
 * ship in a real deployment.
 */
function scrub(message: string): string {
  // Strip any postgres/postgresql connection string so a credential can
  // never leave this endpoint even if a driver error happens to embed one.
  return message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]");
}

export async function GET() {
  const envPresence = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    DATABASE_URL_length: process.env.DATABASE_URL?.length ?? 0,
    DATABASE_URL_host: process.env.DATABASE_URL
      ? scrub(process.env.DATABASE_URL).match(/@([^:/]+)/)?.[1] ?? "unknown"
      : null,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ envPresence, query: "success", result });
  } catch (error) {
    const err = error as Error & { code?: string; name?: string };
    return NextResponse.json(
      {
        envPresence,
        query: "failed",
        errorName: err.name,
        errorCode: err.code,
        errorMessage: err.message ? scrub(err.message) : String(error),
      },
      { status: 200 },
    );
  }
}
