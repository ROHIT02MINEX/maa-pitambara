"use client";

import * as React from "react";
import Image from "next/image";

import { InstituteMark } from "@/components/brand/institute-mark";
import { INSTITUTE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Where the institute's own artwork lives. See `public/brand/README.md`. */
const LOGO_SRC = "/brand/institute-logo.png";

/**
 * The institute logo.
 *
 * Renders the real seal artwork from `public/brand/institute-logo.png`. If that
 * file is not present the drawn `InstituteMark` stands in, so the header never
 * shows a broken image; dropping the artwork into place swaps every instance at
 * once with no code change.
 */
export function InstituteLogo({
  className,
  size = 40,
  title = INSTITUTE.name,
  priority = false,
}: {
  className?: string;
  /** Rendered pixel size of the square logo. */
  size?: number;
  /** Pass `null` when adjacent text already names the institute. */
  title?: string | null;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement | null>(null);

  // A priority image starts loading from the preload scanner, so it can fail
  // before React has attached `onError` and the handler never runs. Re-check
  // the element once on mount: a finished load with no intrinsic width is a
  // failed one.
  React.useEffect(() => {
    const node = ref.current;
    if (node?.complete && node.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return <InstituteMark className={className} title={title} />;
  }

  return (
    <Image
      ref={ref}
      src={LOGO_SRC}
      alt={title ?? ""}
      width={size}
      height={size}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
      // The seal is square with fine lettering around the rim; skipping the
      // optimiser keeps that legible at small sizes.
      unoptimized
    />
  );
}
