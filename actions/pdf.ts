"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByKey, RATE_LIMITS } from "@/lib/rate-limit";
import { actionError, actionOk, type ActionResult } from "@/types";

/**
 * A learner may only ever touch material for their own occupation, so every
 * action re-checks the PDF's occupation against the signed-in user's.
 */
async function assertAccessiblePdf(userId: string, pdfId: string) {
  const [user, pdf] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { occupation: true, role: true } }),
    prisma.pdf.findUnique({ where: { id: pdfId }, select: { id: true, occupation: true } }),
  ]);

  if (!pdf) return { ok: false as const, error: "This document no longer exists." };
  if (user?.role !== "ADMIN" && user?.occupation !== pdf.occupation) {
    return { ok: false as const, error: "This document is not part of your course." };
  }
  return { ok: true as const, pdf };
}

export async function toggleBookmarkAction(
  pdfId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const limit = limitByKey("mutation", sessionUser.id, RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
  if (!limit.success) return actionError("Too many requests. Please slow down.");

  const access = await assertAccessiblePdf(sessionUser.id, pdfId);
  if (!access.ok) return actionError(access.error);

  const existing = await prisma.bookmark.findUnique({
    where: { userId_pdfId: { userId: sessionUser.id, pdfId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    await logActivity({ userId: sessionUser.id, action: ACTIVITY.PDF_UNBOOKMARKED, detail: pdfId });
    revalidatePath("/learn");
    return actionOk({ bookmarked: false }, "Bookmark removed.");
  }

  await prisma.bookmark.create({ data: { userId: sessionUser.id, pdfId } });
  await logActivity({ userId: sessionUser.id, action: ACTIVITY.PDF_BOOKMARKED, detail: pdfId });
  revalidatePath("/learn");
  return actionOk({ bookmarked: true }, "Bookmarked.");
}

/** Records that a learner opened a document (idempotent, increments a counter). */
export async function recordPdfViewAction(pdfId: string): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const access = await assertAccessiblePdf(sessionUser.id, pdfId);
  if (!access.ok) return actionError(access.error);

  await prisma.pdfView.upsert({
    where: { userId_pdfId: { userId: sessionUser.id, pdfId } },
    create: { userId: sessionUser.id, pdfId },
    update: { views: { increment: 1 }, viewedAt: new Date() },
  });

  await logActivity({ userId: sessionUser.id, action: ACTIVITY.PDF_VIEWED, detail: pdfId });
  revalidatePath("/learn");
  revalidatePath("/dashboard");
  return actionOk();
}
