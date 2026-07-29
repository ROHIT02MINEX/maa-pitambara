import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Append-only audit trail. Logging must never break the action it is recording,
 * so every failure is swallowed after being reported to the server console.
 */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  detail?: string | null;
}) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;

    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        detail: params.detail ?? null,
        ip,
        userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      },
    });
  } catch (error) {
    console.error("[activity] failed to write log", error);
  }
}

export const ACTIVITY = {
  SIGNUP: "user.signup",
  LOGIN: "user.login",
  LOGIN_FAILED: "user.login_failed",
  LOGOUT: "user.logout",
  EMAIL_VERIFIED: "user.email_verified",
  PASSWORD_RESET_REQUESTED: "user.password_reset_requested",
  PASSWORD_RESET: "user.password_reset",
  PASSWORD_CHANGED: "user.password_changed",
  PROFILE_CREATED: "user.profile_created",
  PROFILE_UPDATED: "user.profile_updated",
  PDF_VIEWED: "pdf.viewed",
  PDF_BOOKMARKED: "pdf.bookmarked",
  PDF_UNBOOKMARKED: "pdf.unbookmarked",
  TEST_STARTED: "test.started",
  TEST_SUBMITTED: "test.submitted",
  TEST_AUTO_SUBMITTED: "test.auto_submitted",
  ADMIN_PDF_CREATED: "admin.pdf_created",
  ADMIN_PDF_UPDATED: "admin.pdf_updated",
  ADMIN_PDF_DELETED: "admin.pdf_deleted",
  ADMIN_QUESTION_CREATED: "admin.question_created",
  ADMIN_QUESTION_UPDATED: "admin.question_updated",
  ADMIN_QUESTION_DELETED: "admin.question_deleted",
  ADMIN_QUESTIONS_IMPORTED: "admin.questions_imported",
  ADMIN_USER_UPDATED: "admin.user_updated",
  ADMIN_USER_DELETED: "admin.user_deleted",
  ADMIN_USER_DISABLED: "admin.user_disabled",
  ADMIN_USER_ENABLED: "admin.user_enabled",
  ADMIN_USER_PASSWORD_RESET: "admin.user_password_reset",
  ADMIN_EXPORT: "admin.export",
} as const;
