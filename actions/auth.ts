"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { signIn, signOut, hashPassword, verifyPassword, currentUser } from "@/lib/auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "@/lib/mail";
import {
  generateToken,
  hashToken,
  RESET_TOKEN_TTL_MS,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/tokens";
import { limitByIdentifier, resetRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { downgradeSessionCookieToBrowserSession } from "@/lib/session-cookie";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { absoluteUrl } from "@/lib/utils";
import { emailVerificationRequired } from "@/lib/env";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations/auth";
import { actionError, actionOk, type ActionResult } from "@/types";

const GENERIC_CREDENTIALS_ERROR = "Incorrect e-mail or password.";

async function issueVerificationEmail(userId: string, email: string, name: string) {
  // One live verification token per user.
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  const raw = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token: hashToken(raw),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  return sendVerificationEmail(email, name, absoluteUrl(`/verify-email?token=${raw}`));
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ emailSent: boolean; verificationRequired: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const { name, email, password } = parsed.data;

  const limit = await limitByIdentifier("register", email, RATE_LIMITS.register, RATE_LIMITS.ipAuth);
  if (!limit.success) {
    return actionError(`Too many sign-up attempts. Try again in ${limit.retryAfter}s.`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, name: true, emailVerified: true },
  });

  if (existing?.passwordHash) {
    return actionError("An account with this e-mail already exists. Try signing in instead.");
  }

  const passwordHash = await hashPassword(password);

  // With no way to deliver the link, demanding verification would lock the
  // account out for good — so the address is accepted as-is instead.
  const requireVerification = emailVerificationRequired();

  // A Google-first user adding a password: attach credentials to the account.
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: existing.name ?? name,
          ...(requireVerification ? {} : { emailVerified: existing.emailVerified ?? new Date() }),
        },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          ...(requireVerification ? {} : { emailVerified: new Date() }),
        },
      });

  await logActivity({ userId: user.id, action: ACTIVITY.SIGNUP, detail: email });

  if (user.emailVerified) {
    return actionOk(
      { emailSent: false, verificationRequired: false },
      "Account created. You can sign in now.",
    );
  }

  const result = await issueVerificationEmail(user.id, email, name);
  return actionOk(
    { emailSent: result.delivered, verificationRequired: true },
    "Account created. Check your inbox to verify your e-mail address.",
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function loginAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo?: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;

  // Throttled per account first, then by IP — so one learner's mistyped
  // password never locks out the rest of a shared computer lab.
  const limit = await limitByIdentifier("login", email, RATE_LIMITS.login, RATE_LIMITS.ipAuth);
  if (!limit.success) {
    return actionError(`Too many sign-in attempts. Try again in ${limit.retryAfter}s.`);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash) {
    await logActivity({ action: ACTIVITY.LOGIN_FAILED, detail: email });
    return actionError(GENERIC_CREDENTIALS_ERROR);
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await logActivity({ userId: user.id, action: ACTIVITY.LOGIN_FAILED, detail: email });
    return actionError(GENERIC_CREDENTIALS_ERROR);
  }
  if (user.disabled) {
    return actionError("This account has been disabled. Please contact your administrator.");
  }
  if (emailVerificationRequired() && !user.emailVerified) {
    return actionError(
      "Please verify your e-mail address before signing in. Check your inbox for the link.",
      undefined,
    );
  }


  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return actionError(GENERIC_CREDENTIALS_ERROR);
    throw error;
  }

  // "Remember me" unchecked → keep the session only until the browser closes.
  if (!parsed.data.remember) await downgradeSessionCookieToBrowserSession();

  // A successful sign-in clears the failed-attempt counter for this account.
  resetRateLimit(`login:id:${email}`);

  await logActivity({ userId: user.id, action: ACTIVITY.LOGIN, detail: email });

  const profileComplete = Boolean(user.name && user.phone && user.occupation);
  return actionOk({
    redirectTo: user.role === "ADMIN" ? "/admin" : profileComplete ? "/dashboard" : "/onboarding",
  });
}

export async function googleSignInAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl || "/dashboard" });
}

export async function logoutAction() {
  const user = await currentUser();
  if (user?.id) await logActivity({ userId: user.id, action: ACTIVITY.LOGOUT });
  await signOut({ redirectTo: "/login" });
}

// ---------------------------------------------------------------------------
// E-mail verification
// ---------------------------------------------------------------------------

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  if (!token || token.length < 10) return actionError("This verification link is invalid.");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: { select: { id: true, email: true, emailVerified: true } } },
  });

  if (!record) return actionError("This verification link is invalid or has already been used.");
  if (record.expires < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return actionError("This verification link has expired. Request a new one below.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  await logActivity({
    userId: record.userId,
    action: ACTIVITY.EMAIL_VERIFIED,
    detail: record.user.email,
  });

  return actionOk(undefined, "E-mail verified. You can sign in now.");
}

export async function resendVerificationAction(input: unknown): Promise<ActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return actionError("Enter a valid e-mail address.");

  const limit = await limitByIdentifier(
    "resendVerification",
    parsed.data.email,
    RATE_LIMITS.resendVerification,
    RATE_LIMITS.ipAuth,
  );
  if (!limit.success) {
    return actionError(`Too many requests. Try again in ${limit.retryAfter}s.`);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Always report success so the endpoint cannot enumerate accounts.
  if (user && !user.emailVerified && !user.disabled) {
    await issueVerificationEmail(user.id, user.email, user.name ?? "");
  }

  return actionOk(undefined, "If that address needs verification, a new link is on its way.");
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return actionError("Enter a valid e-mail address.");

  const limit = await limitByIdentifier(
    "forgotPassword",
    parsed.data.email,
    RATE_LIMITS.forgotPassword,
    RATE_LIMITS.ipAuth,
  );
  if (!limit.success) {
    return actionError(`Too many requests. Try again in ${limit.retryAfter}s.`);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user && !user.disabled) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const raw = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashToken(raw),
        expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    await sendPasswordResetEmail(
      user.email,
      user.name ?? "",
      absoluteUrl(`/reset-password?token=${raw}`),
    );
    await logActivity({ userId: user.id, action: ACTIVITY.PASSWORD_RESET_REQUESTED });
  }

  return actionOk(
    undefined,
    "If an account exists for that address, a reset link has been sent.",
  );
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  // Keyed on the token itself, so guessing one link cannot lock out others.
  const limit = await limitByIdentifier(
    "resetPassword",
    parsed.data.token.slice(0, 24),
    RATE_LIMITS.resetPassword,
    RATE_LIMITS.ipAuth,
  );
  if (!limit.success) {
    return actionError(`Too many attempts. Try again in ${limit.retryAfter}s.`);
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(parsed.data.token) },
    include: { user: { select: { id: true, email: true, name: true, disabled: true } } },
  });

  if (!record || record.usedAt || record.expires < new Date()) {
    return actionError("This reset link is invalid or has expired. Request a new one.");
  }
  if (record.user.disabled) return actionError("This account has been disabled.");

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      // Resetting via an e-mailed link also proves ownership of the address.
      data: { passwordHash, emailVerified: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate every existing database session for this account.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await sendPasswordChangedEmail(record.user.email, record.user.name ?? "");
  await logActivity({ userId: record.userId, action: ACTIVITY.PASSWORD_RESET });

  return actionOk(undefined, "Password updated. You can sign in with your new password.");
}

// ---------------------------------------------------------------------------
// Change password (signed in)
// ---------------------------------------------------------------------------

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return actionError("Account not found.");

  if (!user.passwordHash) {
    // Google-only account setting a password for the first time.
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logActivity({ userId: user.id, action: ACTIVITY.PASSWORD_CHANGED });
    revalidatePath("/profile");
    return actionOk(undefined, "Password set. You can now sign in with e-mail and password.");
  }

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return actionError("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await sendPasswordChangedEmail(user.email, user.name ?? "");
  await logActivity({ userId: user.id, action: ACTIVITY.PASSWORD_CHANGED });

  revalidatePath("/profile");
  return actionOk(undefined, "Password changed successfully.");
}
