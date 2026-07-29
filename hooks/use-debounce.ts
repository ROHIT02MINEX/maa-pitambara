"use client";

import * as React from "react";

/** Returns `value` after it has stopped changing for `delay` milliseconds. */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
