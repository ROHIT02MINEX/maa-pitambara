"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surfaced in the platform logs; the digest links back to the server trace.
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="app-shell-bg grid min-h-dvh place-items-center p-6">
      <div className="glass w-full max-w-md rounded-xl p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertOctagon className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error interrupted this page. Try again — if it keeps happening, contact your
          administrator.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
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
