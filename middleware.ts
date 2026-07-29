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

  if (isLoggedIn && AUTH_ROUTES.includes(pathname)) {
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
  const profileComplete = session?.user?.profileComplete === true;

  if (!profileComplete && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }
  if (profileComplete && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (pathname.startsWith("/admin") && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
