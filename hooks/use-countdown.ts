"use client";

import * as React from "react";

/**
 * Counts down to an absolute deadline supplied by the server.
 *
 * Deriving the remaining time from `expiresAt` (rather than decrementing a
 * local number) means reloading the page, sleeping the laptop or changing tabs
 * cannot buy the candidate extra time.
 */
export function useCountdown(expiresAtIso: string, onExpire?: () => void) {
  const expiresAt = React.useMemo(() => new Date(expiresAtIso).getTime(), [expiresAtIso]);
  const [remaining, setRemaining] = React.useState(() =>
    Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
  );

  const firedRef = React.useRef(false);
  const onExpireRef = React.useRef(onExpire);
  onExpireRef.current = onExpire;

  React.useEffect(() => {
    function tick() {
      const next = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}
