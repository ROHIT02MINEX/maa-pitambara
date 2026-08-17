"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon, CloudOff, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Diagnosis = "checking" | "service-down" | "app-error";

/**
 * Root error boundary.
 *
 * Next.js strips the real error message in production and hands us only an
 * opaque `digest`, so this component cannot tell from `error` alone whether the
 * portal hit a genuine bug or simply could not reach the database. That matters
 * a great deal here: the database is the far more common cause (the hosted
 * Postgres auto-pauses when idle), and "Something went wrong" makes a routine,
 * self-resolving outage look like the site is broken.
 *
 * So we ask `/api/health` — which never touches the failing page's code path —
 * and tailor the message. A learner who lost their connection mid-test gets
 * "come back in a few minutes", not a scary crash screen.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [diagnosis, setDiagnosis] = React.useState<Diagnosis>("checking");

  React.useEffect(() => {
    // Surfaced in the platform logs; the digest links back to the server trace.
    console.error("[app] unhandled error", error);
  }, [error]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((body: { database?: string }) => {
        if (cancelled) return;
        setDiagnosis(body?.database === "up" ? "app-error" : "service-down");
      })
      .catch(() => {
        // Health check itself unreachable — that is still an outage, not a bug
        // in the page the user was on.
        if (!cancelled) setDiagnosis("service-down");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const isDown = diagnosis === "service-down";

  return (
    <div className="app-shell-bg grid min-h-dvh place-items-center p-6">
      <div className="glass w-full max-w-md rounded-xl p-8 text-center">
        <span
          className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${
            isDown ? "bg-warning/15 text-warning" : "bg-destructive/10 text-destructive"
          }`}
        >
          {diagnosis === "checking" ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : isDown ? (
            <CloudOff className="h-7 w-7" aria-hidden />
          ) : (
            <AlertOctagon className="h-7 w-7" aria-hidden />
          )}
        </span>

        {diagnosis === "checking" ? (
          <>
            <h1 className="text-xl font-bold tracking-tight">Checking connection…</h1>
            <p className="mt-2 text-sm text-muted-foreground">One moment.</p>
          </>
        ) : isDown ? (
          <>
            <h1 className="text-xl font-bold tracking-tight">
              The portal is temporarily offline
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We can&apos;t reach the server right now. This is usually brief, so please wait a
              minute and try again. Nothing you have already submitted has been lost.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error interrupted this page. Try again. If it keeps happening,
              contact your institute.
            </p>
          </>
        )}

        {error.digest && !isDown ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
