"use client";
import { T } from "@/components/translated-text";


import { cn } from "@/lib/utils";

const RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "lowercase", test: (v: string) => /[a-z]/.test(v) },
  { label: "uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { label: "number", test: (v: string) => /\d/.test(v) },
];

const LEVELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

/** Live feedback against the same rules the server enforces. */
export function PasswordStrength({ password }: { password: string }) {
  const passed = RULES.filter((rule) => rule.test(password)).length;
  const level = password.length === 0 ? 0 : passed;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5" role="presentation">
        {RULES.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index < level
                ? level <= 2
                  ? "bg-destructive"
                  : level === 3
                    ? "bg-warning"
                    : "bg-success"
                : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {password.length === 0 ? (
          "Use 8+ characters with upper- and lowercase letters and a number."
        ) : (
          <>
            <span className="font-medium text-foreground"><T>{LEVELS[level]}</T></span>
            <T>{". Missing: "}</T>
            <T>{RULES.filter((rule) => !rule.test(password))
              .map((rule) => rule.label)
              .join(", ") || "nothing, looks good"}</T>
          </>
        )}
      </p>
    </div>
  );
}
