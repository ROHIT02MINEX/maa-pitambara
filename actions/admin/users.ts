"use server";

import { revalidatePath } from "next/cache";
import { Occupation, Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByIp, RATE_LIMITS } from "@/lib/rate-limit";
import { sendAdminResetEmail } from "@/lib/mail";
import { generateToken, hashToken, RESET_TOKEN_TTL_MS } from "@/lib/tokens";
import { absoluteUrl } from "@/lib/utils";
import { nameSchema } from "@/lib/validations/auth";
import { phoneSchema } from "@/lib/validations/profile";
import { actionError, actionOk, type ActionResult } from "@/types";

const updateUserSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  occupation: z.nativeEnum(Occupation).nullable().optional(),
  role: z.nativeEnum(Role),
});

async function guard() {
  try {
    const admin = await requireAdmin();
    const limit = await limitByIp("mutation", RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
    if (!limit.success) return { ok: false as const, error: "Too many requests. Please slow down." };
    return { ok: true as const, admin };
  } catch {
    return { ok: false as const, error: "Administrator access is required." };
  }
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, role: true, email: true },
  });
  if (!target) return actionError("That user no longer exists.");

  // Never let the last administrator demote themselves out of the panel.
  if (target.role === Role.ADMIN && parsed.data.role !== Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) return actionError("At least one administrator must remain.");
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      occupation: parsed.data.occupation ?? null,
      role: parsed.data.role,
    },
  });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_USER_UPDATED,
    detail: target.email,
  });

  revalidatePath("/admin/users");
  return actionOk(undefined, "User updated.");
}

export async function setUserDisabledAction(
  id: string,
  disabled: boolean,
): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);
  if (id === gate.admin.id) return actionError("You cannot disable your own account.");

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return actionError("That user no longer exists.");

  if (disabled && target.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN, disabled: false } });
    if (adminCount <= 1) return actionError("At least one active administrator must remain.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { disabled } }),
    // Disabling immediately terminates any database-backed session.
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  await logActivity({
    userId: gate.admin.id,
    action: disabled ? ACTIVITY.ADMIN_USER_DISABLED : ACTIVITY.ADMIN_USER_ENABLED,
    detail: target.email,
  });

  revalidatePath("/admin/users");
  return actionOk(undefined, disabled ? "User disabled." : "User enabled.");
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);
  if (id === gate.admin.id) return actionError("You cannot delete your own account.");

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return actionError("That user no longer exists.");

  if (target.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) return actionError("At least one administrator must remain.");
  }

  await prisma.user.delete({ where: { id } });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_USER_DELETED,
    detail: target.email,
  });

  revalidatePath("/admin/users");
  return actionOk(undefined, "User deleted.");
}

/**
 * Issues a password-reset link for a user. The administrator never sees or
 * sets the password themselves.
 */
export async function resetUserPasswordAction(id: string): Promise<ActionResult<{ sent: boolean }>> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!target) return actionError("That user no longer exists.");

  await prisma.passwordResetToken.deleteMany({ where: { userId: id, usedAt: null } });

  const raw = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: id,
      token: hashToken(raw),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const result = await sendAdminResetEmail(
    target.email,
    target.name ?? "",
    absoluteUrl(`/reset-password?token=${raw}`),
  );

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_USER_PASSWORD_RESET,
    detail: target.email,
  });

  return actionOk(
    { sent: result.delivered },
    result.delivered
      ? `A reset link has been e-mailed to ${target.email}.`
      : "Reset link generated. SMTP is not configured, so it was written to the server log.",
  );
}
