import { handlers } from "@/lib/auth";

/** Auth.js route handlers (sign-in, callback, session, CSRF, sign-out). */
export const { GET, POST } = handlers;

export const runtime = "nodejs";
