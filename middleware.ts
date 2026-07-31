import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/** Routes reachable without a session. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/** Signed-in users are bounced away from these. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = Boolean(session?.user?.id);

  // Auth.js endpoints and the health probe must always pass through untouched.
  if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
    return NextResponse.next();
  }

  // Unauthenticated API access returns JSON rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname.startsWith("/api/admin") && session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // `?expired=1` means a server component found the session invalid (deleted or
  // disabled account) while this cookie still decodes. Without this escape the
  // two would bounce each other forever.
  const sessionExpired = nextUrl.searchParams.get("expired") === "1";

  if (isLoggedIn && !sessionExpired && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isLoggedIn) {
    if (isPublic(pathname)) return NextResponse.next();
    const callbackUrl = `${pathname}${nextUrl.search}`;
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(url);
  }

  // Signed in from here on.
  //
  // Profile completeness is deliberately NOT enforced here. Middleware runs on
  // the Edge and can only decode the JWT — it cannot refresh it from the
  // database, so straight after onboarding this cookie still says "incomplete"
  // while the server components (which do refresh) say "complete". Gating on it
  // in both places made them disagree and bounce forever:
  //   /onboarding -> page says complete -> /dashboard -> middleware says
  //   incomplete -> /onboarding -> ...
  // The check now lives only in `(app)/layout.tsx` and the onboarding page,
  // which read the same freshly-refreshed session and therefore cannot disagree.

  if (pathname.startsWith("/admin") && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
