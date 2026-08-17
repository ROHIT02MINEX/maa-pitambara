"use server";

import { revalidatePath } from "next/cache";
import { RetestStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { currentUser, requireAdmin } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByKey, RATE_LIMITS } from "@/lib/rate-limit";
import { getTestEligibility } from "@/lib/retest";
import { actionError, actionOk, type ActionResult } from "@/types";

const requestSchema = z.object({
  reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
});

const reviewSchema = z.object({
  id: z.string().min(1),
  approve: z.boolean(),
  adminNote: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Learner
// ---------------------------------------------------------------------------

export async function requestRetestAction(input: unknown): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");
  if (!sessionUser.occupation) return actionError("Complete your profile first.");

  const limit = limitByKey(
    "mutation",
    sessionUser.id,
    RATE_LIMITS.mutation.limit,
    RATE_LIMITS.mutation.windowMs,
  );
  if (!limit.success) return actionError("Too many requests. Please slow down.");

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const eligibility = await getTestEligibility(sessionUser.id);
  if (eligibility.allowed) {
    return actionError("You can already start a test. No request is needed.");
  }
  if (eligibility.reason === "pending-request") {
    return actionError("You already have a request awaiting review.");
  }

  await prisma.retestRequest.create({
    data: {
      userId: sessionUser.id,
      occupation: sessionUser.occupation,
      reason: parsed.data.reason || null,
    },
  });

  await logActivity({ userId: sessionUser.id, action: ACTIVITY.RETEST_REQUESTED });

  revalidatePath("/tests");
  return actionOk(undefined, "Request sent. You will be able to retake the test once approved.");
}

// ---------------------------------------------------------------------------
// Administrator
// ---------------------------------------------------------------------------

export async function reviewRetestAction(input: unknown): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return actionError("Administrator access is required.");
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid review payload.");

  const request = await prisma.retestRequest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, user: { select: { email: true } } },
  });
  if (!request) return actionError("That request no longer exists.");
  if (request.status !== RetestStatus.PENDING) {
    return actionError("That request has already been reviewed.");
  }

  await prisma.retestRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.approve ? RetestStatus.APPROVED : RetestStatus.REJECTED,
      adminNote: parsed.data.adminNote || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  await logActivity({
    userId: admin.id,
    action: parsed.data.approve ? ACTIVITY.RETEST_APPROVED : ACTIVITY.RETEST_REJECTED,
    detail: request.user.email,
  });

  revalidatePath("/admin/retests");
  revalidatePath("/tests");
  return actionOk(
    undefined,
    parsed.data.approve ? "Retest approved." : "Retest request rejected.",
  );
}
