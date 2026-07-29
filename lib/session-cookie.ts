import "server-only";
import { cookies } from "next/headers";

const SESSION_COOKIE_PATTERN = /authjs\.session-token(\.\d+)?$/;

/**
 * Turns the persistent session cookie into a browser-session cookie.
 *
 * Auth.js sets a single `maxAge` for every session, so "Remember me" is
 * implemented by rewriting the cookie without an expiry when the box is left
 * unchecked — the session then dies when the browser closes.
 */
export async function downgradeSessionCookieToBrowserSession() {
  const store = await cookies();

  for (const cookie of store.getAll()) {
    if (!SESSION_COOKIE_PATTERN.test(cookie.name)) continue;
    store.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: cookie.name.startsWith("__Secure-"),
      // No `maxAge` / `expires` → the browser drops it when it closes.
    });
  }
}
