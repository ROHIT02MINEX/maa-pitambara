import "server-only";

import { ACTIVITY } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

export const LOGIN_APPROVAL_TTL_MS = 15 * 60 * 1000;

async function latestUsableApproval(userId: string) {
  const approval = await prisma.activityLog.findFirst({
    where: { userId, action: ACTIVITY.LOGIN_APPROVAL_APPROVED },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  if (!approval || approval.createdAt.getTime() + LOGIN_APPROVAL_TTL_MS <= Date.now()) return null;
  const consumed = await prisma.activityLog.findFirst({
    where: { userId, action: ACTIVITY.LOGIN_APPROVAL_CONSUMED, detail: approval.id },
    select: { id: true },
  });
  return consumed ? null : approval;
}

export async function hasUsableLoginApproval(userId: string) {
  return Boolean(await latestUsableApproval(userId));
}

export async function ensurePendingLoginRequest(userId: string) {
  const existing = await prisma.activityLog.findFirst({
    where: { userId, action: ACTIVITY.LOGIN_APPROVAL_REQUESTED },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const decision = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: { in: [ACTIVITY.LOGIN_APPROVAL_APPROVED, ACTIVITY.LOGIN_APPROVAL_REJECTED] },
        detail: { startsWith: `${existing.id}|` },
      },
      select: { id: true },
    });
    if (!decision) return existing;
  }
  return prisma.activityLog.create({
    data: { userId, action: ACTIVITY.LOGIN_APPROVAL_REQUESTED },
  });
}

export async function consumeLoginApproval(userId: string) {
  const approval = await latestUsableApproval(userId);
  if (!approval) return false;
  return prisma.$transaction(async (tx) => {
    const consumed = await tx.activityLog.findFirst({
      where: { userId, action: ACTIVITY.LOGIN_APPROVAL_CONSUMED, detail: approval.id },
      select: { id: true },
    });
    if (consumed) return false;
    await tx.activityLog.create({
      data: { userId, action: ACTIVITY.LOGIN_APPROVAL_CONSUMED, detail: approval.id },
    });
    return true;
  });
}

export async function listLoginRequests() {
  const requests = await prisma.activityLog.findMany({
    where: { action: ACTIVITY.LOGIN_APPROVAL_REQUESTED, userId: { not: null } },
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true, occupation: true } } },
  });
  const requestIds = new Set(requests.map((request) => request.id));
  const decisions = await prisma.activityLog.findMany({
    where: { action: { in: [ACTIVITY.LOGIN_APPROVAL_APPROVED, ACTIVITY.LOGIN_APPROVAL_REJECTED] } },
    take: 300,
    orderBy: { createdAt: "desc" },
  });
  const consumed = await prisma.activityLog.findMany({
    where: { action: ACTIVITY.LOGIN_APPROVAL_CONSUMED },
    take: 300,
    select: { detail: true },
  });
  const consumedIds = new Set(consumed.map((row) => row.detail).filter(Boolean));
  const adminIds = new Set<string>();
  const decisionsByRequest = new Map<string, (typeof decisions)[number]>();
  for (const decision of decisions) {
    const [requestId, adminId] = decision.detail?.split("|") ?? [];
    if (!requestId || !requestIds.has(requestId) || decisionsByRequest.has(requestId)) continue;
    decisionsByRequest.set(requestId, decision);
    if (adminId) adminIds.add(adminId);
  }
  const admins = await prisma.user.findMany({
    where: { id: { in: [...adminIds] } },
    select: { id: true, name: true, email: true },
  });
  const adminsById = new Map(admins.map((admin) => [admin.id, admin]));

  return requests.map((request) => {
    const decision = decisionsByRequest.get(request.id);
    const [, adminId] = decision?.detail?.split("|") ?? [];
    return {
      id: request.id,
      user: request.user!,
      createdAt: request.createdAt,
      status: !decision
        ? ("PENDING" as const)
        : decision.action === ACTIVITY.LOGIN_APPROVAL_APPROVED
          ? ("APPROVED" as const)
          : ("REJECTED" as const),
      consumedAt: decision && consumedIds.has(decision.id) ? decision.createdAt : null,
      reviewedBy: adminId ? (adminsById.get(adminId) ?? null) : null,
    };
  });
}
