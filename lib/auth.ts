import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { emailVerificationRequired } from "@/lib/env";
import { loginSchema } from "@/lib/validations/auth";

/** How long a JWT may go without being re-checked against the database. */
const TOKEN_REFRESH_MS = 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        // Compare against a dummy hash when the account does not exist so the
        // response time does not reveal whether an e-mail is registered.
        const hash =
          user?.passwordHash ??
          "$2a$12$0000000000000000000000000000000000000000000000000000";
        const ok = await bcrypt.compare(parsed.data.password, hash);

        if (!user || !user.passwordHash || !ok) return null;
        if (user.disabled) return null;
        // Only gate on verification when the deployment can actually send the
        // link; see `emailVerificationRequired()`.
        if (emailVerificationRequired() && !user.emailVerified) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          occupation: user.occupation,
          phone: user.phone,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /** Final gate: disabled accounts can never establish a session. */
    async signIn({ user }) {
      if (!user?.email) return false;
      const record = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { disabled: true },
      });
      if (record?.disabled) return false;
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      const stale = !token.refreshedAt || Date.now() - token.refreshedAt > TOKEN_REFRESH_MS;
      if (!user && trigger !== "update" && !stale) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          phone: true,
          occupation: true,
          disabled: true,
          emailVerified: true,
        },
      });

      // User was deleted (or disabled) — invalidate the token contents.
      if (!dbUser || dbUser.disabled) return { ...token, id: undefined, sub: undefined };

      token.id = dbUser.id;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.role = dbUser.role;
      token.phone = dbUser.phone;
      token.occupation = dbUser.occupation;
      token.profileComplete = Boolean(dbUser.name && dbUser.phone && dbUser.occupation);
      token.refreshedAt = Date.now();
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await prisma.user
        .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        .catch(() => undefined);
    },
  },
});

// ---------------------------------------------------------------------------
// Server-side session helpers
// ---------------------------------------------------------------------------

export type SessionUser = Session["user"];

/** Returns the session user or `null`. Never throws. */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) throw new Error("FORBIDDEN");
  return user;
}

export async function isAdmin() {
  const user = await currentUser();
  return user?.role === Role.ADMIN;
}

export const PASSWORD_SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
