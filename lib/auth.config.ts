import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe slice of the Auth.js configuration.
 *
 * The middleware runs on the Edge runtime where Prisma and bcrypt are not
 * available, so it only ever loads this file. The full configuration
 * (adapter + credentials provider + database callbacks) lives in `lib/auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days ("remember me" ceiling)
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Google verifies e-mail ownership, so linking an OAuth identity to
            // an existing account with the same address is safe here.
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: { prompt: "select_account", access_type: "offline" },
            },
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                emailVerified: profile.email_verified ? new Date() : null,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    // Populated with real data by the Node-runtime callbacks in `lib/auth.ts`.
    // Kept here so the middleware can read whatever is already on the token.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub ?? token.id) as string;
        session.user.role = token.role ?? "USER";
        session.user.occupation = token.occupation ?? null;
        session.user.phone = token.phone ?? null;
        session.user.profileComplete = token.profileComplete ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
