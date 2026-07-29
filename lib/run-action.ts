import type { ActionResult } from "@/types";

/**
 * Calls a Server Action and guarantees an `ActionResult` back.
 *
 * A Server Action can *reject* rather than return — an unreachable database, a
 * cold-start timeout, a dropped connection. Without this, `await someAction()`
 * throws inside an event handler, the form's `isSubmitting` never resets and
 * the user is left staring at a spinner with no explanation.
 *
 * Next.js masks server error messages in production (they arrive as an opaque
 * digest), so the message here is deliberately generic; the real cause is in
 * the server logs.
 *
 * Do NOT wrap actions that redirect — `redirect()` and `signOut()` signal by
 * throwing, and swallowing that would break the navigation.
 */
export async function runAction<T>(
  action: () => Promise<ActionResult<T>>,
  fallbackMessage = "Something went wrong on the server. Please try again.",
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch (error) {
    console.error("[action] request failed", error);
    return { ok: false, error: fallbackMessage };
  }
}
