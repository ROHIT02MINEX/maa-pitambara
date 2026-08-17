"use client";

import { Languages } from "lucide-react";

import { LANGUAGE_LABELS, LANGUAGES, type Language } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * English / हिन्दी switch for bilingual content.
 *
 * A segmented control rather than a dropdown: with only two options it is one
 * tap instead of two, and both labels stay visible, which matters when the
 * learner cannot read the one that is currently active.
 */
export function LanguageToggle({
  value,
  onChange,
  className,
  /** Shown when a question has no Hindi text of its own. */
  unavailable = false,
}: {
  value: Language;
  onChange: (next: Language) => void;
  className?: string;
  unavailable?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-background/70 p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Reading language"
    >
      <Languages className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {LANGUAGES.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              option === "hi" && "font-devanagari",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {LANGUAGE_LABELS[option]}
          </button>
        );
      })}
      {unavailable && value === "hi" ? (
        <span className="px-1 text-[11px] text-muted-foreground">English only</span>
      ) : null}
    </div>
  );
}
