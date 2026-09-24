"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { ChevronDown, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mppiti.optionalSetupNotice.dismissed";

/**
 * Optional-integration status for the admin dashboard.
 *
 * Deliberately NOT an alert. These integrations are genuinely optional and
 * nothing is broken without them, so a persistent amber warning misreads as a
 * fault every time the page loads. This is a quiet, collapsible, dismissible
 * note instead — the information stays available for whoever is doing setup,
 * without implying the portal is unhealthy.
 *
 * The dismissal is per-browser (localStorage) rather than per-account: it is a
 * cosmetic preference, not something worth a database round-trip.
 */
export function OptionalSetupNotice({ missing }: { missing: string[] }) {
  // Start hidden and reveal after reading localStorage, so a dismissed notice
  // never flashes on screen during hydration.
  const [ready, setReady] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Private mode or blocked storage — just show it.
      setDismissed(false);
    }
    setReady(true);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Non-fatal: it simply reappears next visit.
    }
  }

  if (missing.length === 0 || !ready || dismissed) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            <T>{missing.length}</T><T>{" optional feature"}</T><T>{missing.length === 1 ? "" : "s"}</T><T>{" available "}</T></span><T>{" "}</T><T>{" Everything else is working normally. "}</T></p>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <T>{open ? "Hide" : "Details"}</T>
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss this notice"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {open ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-2 text-xs text-muted-foreground"><T>{" These need credentials only you can obtain, so they are left unset. The portal is fully usable without them: "}</T></p>
          <ul className="space-y-1.5">
            {missing.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <span><T>{item}</T></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground"><T>{" Setup steps for each are in the project README. "}</T></p>
        </div>
      ) : null}
    </div>
  );
}
