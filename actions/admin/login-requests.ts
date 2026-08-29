"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { actionError, actionOk, type ActionResult } from "@/types";

async function reviewLoginRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
): Promise<ActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return actionError("Administrator access is required.");

  const request = await prisma.activityLog.findUnique({
    where: { id },
    select: { id: true, action: true, userId: true },
  });
  if (!request || request.action !== ACTIVITY.LOGIN_APPROVAL_REQUESTED || !request.userId) {
    return actionError("That login request no longer exists.");
  }
  const reviewed = await prisma.activityLog.findFirst({
    where: {
      userId: request.userId,
      action: { in: [ACTIVITY.LOGIN_APPROVAL_APPROVED, ACTIVITY.LOGIN_APPROVAL_REJECTED] },
      detail: { startsWith: `${request.id}|` },
    },
    select: { id: true },
  });
  if (reviewed) return actionError("That login request has already been reviewed.");

  await prisma.activityLog.create({
    data: {
      userId: request.userId,
      action:
        status === "APPROVED"
          ? ACTIVITY.LOGIN_APPROVAL_APPROVED
          : ACTIVITY.LOGIN_APPROVAL_REJECTED,
      detail: `${request.id}|${admin.id}`,
    },
  });
  await logActivity({
    userId: admin.id,
    action:
      status === "APPROVED"
        ? ACTIVITY.LOGIN_APPROVAL_APPROVED
        : ACTIVITY.LOGIN_APPROVAL_REJECTED,
    detail: `${request.userId}:${request.id}`,
  });

  revalidatePath("/admin/login-requests");
  return actionOk(
    undefined,
    status === "APPROVED" ? "Login approved for 15 minutes." : "Login request rejected.",
  );
}

export async function approveLoginRequestAction(id: string) {
  return reviewLoginRequest(id, "APPROVED");
}

export async function rejectLoginRequestAction(id: string) {
  return reviewLoginRequest(id, "REJECTED");
}
