import { cn } from "@/lib/utils";

/**
 * Compact institute mark — the seal reduced to the motifs that survive at
 * 24 px: the navy ring with its gold inner line, a gear, the rising sun and
 * the open book.
 *
 * Colours come from the palette tokens rather than the seal's literal hex
 * values so the mark inverts correctly in dark mode. Use `<InstituteSeal>`
 * where there is room for the full crest.
 */
export function InstituteMark({
  className,
  title = "Maa Pitambra Private ITI",
}: {
  className?: string;
  /** Pass `null` to mark it decorative when adjacent text already names it. */
  title?: string | null;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-9 w-9", className)}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      <circle cx="32" cy="32" r="31" fill="hsl(var(--primary))" />
      <circle
        cx="32"
        cy="32"
        r="27.5"
        fill="none"
        stroke="hsl(var(--gold))"
        strokeWidth="1.6"
      />

      {/* Gear teeth around the sun — the "skill" half of the crest. */}
      <g fill="hsl(var(--gold))">
        {Array.from({ length: 12 }).map((_, index) => (
          <rect
            key={index}
            x="30.6"
            y="6.5"
            width="2.8"
            height="5.4"
            rx="1.2"
            transform={`rotate(${index * 30} 32 32)`}
          />
        ))}
      </g>

      {/* Rising sun. */}
      <circle cx="32" cy="30" r="8.4" fill="hsl(var(--gold))" />
      <path d="M23.6 30a8.4 8.4 0 0 1 16.8 0Z" fill="hsl(var(--saffron))" />

      {/* Open book. */}
      <path
        d="M14 38.6c6.2-2.6 12.2-2.6 18 0 5.8-2.6 11.8-2.6 18 0v10.8c-6.2-2.6-12.2-2.6-18 0-5.8-2.6-11.8-2.6-18 0Z"
        fill="hsl(var(--primary-foreground))"
      />
      <path d="M32 38.6v10.8" stroke="hsl(var(--primary))" strokeWidth="1.8" />
    </svg>
  );
}
