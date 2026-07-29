"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deletePdf } from "@/lib/supabase";
import { publicPdfUrl, verifyStoredPdf } from "@/lib/storage";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByIp, RATE_LIMITS } from "@/lib/rate-limit";
import { pdfMetaSchema } from "@/lib/validations/content";
import { actionError, actionOk, type ActionResult } from "@/types";

const createSchema = pdfMetaSchema.extend({
  storagePath: z.string().min(3).max(400),
});

const updateSchema = pdfMetaSchema.extend({
  id: z.string().min(1),
  /** Present only when the admin replaced the underlying file. */
  storagePath: z.string().min(3).max(400).optional(),
});

async function guard() {
  try {
    const admin = await requireAdmin();
    const limit = await limitByIp("upload", RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs);
    if (!limit.success) return { ok: false as const, error: "Too many requests. Please slow down." };
    return { ok: true as const, admin };
  } catch {
    return { ok: false as const, error: "Administrator access is required." };
  }
}

export async function createPdfAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  let stored;
  try {
    stored = await verifyStoredPdf(parsed.data.storagePath);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Upload verification failed.");
  }

  const pdf = await prisma.pdf.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      occupation: parsed.data.occupation,
      topic: parsed.data.topic || null,
      storagePath: parsed.data.storagePath,
      fileUrl: publicPdfUrl(parsed.data.storagePath),
      fileSize: stored.size,
      mimeType: stored.mimeType,
      uploadedById: gate.admin.id,
    },
    select: { id: true },
  });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_PDF_CREATED,
    detail: `${parsed.data.title} (${parsed.data.occupation})`,
  });

  revalidatePath("/admin/pdfs");
  revalidatePath("/learn");
  return actionOk({ id: pdf.id }, "Document published.");
}

export async function updatePdfAction(input: unknown): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.pdf.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return actionError("That document no longer exists.");

  let fileFields: { storagePath: string; fileUrl: string; fileSize: number; mimeType: string } | null =
    null;

  if (parsed.data.storagePath && parsed.data.storagePath !== existing.storagePath) {
    try {
      const stored = await verifyStoredPdf(parsed.data.storagePath);
      fileFields = {
        storagePath: parsed.data.storagePath,
        fileUrl: publicPdfUrl(parsed.data.storagePath),
        fileSize: stored.size,
        mimeType: stored.mimeType,
      };
    } catch (error) {
      return actionError(error instanceof Error ? error.message : "Upload verification failed.");
    }
  }

  await prisma.pdf.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      occupation: parsed.data.occupation,
      topic: parsed.data.topic || null,
      ...(fileFields ?? {}),
    },
  });

  // Only remove the old object once the row points at the new one.
  if (fileFields) await deletePdf(existing.storagePath).catch(() => undefined);

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_PDF_UPDATED,
    detail: `${parsed.data.title}${fileFields ? " (file replaced)" : ""}`,
  });

  revalidatePath("/admin/pdfs");
  revalidatePath("/learn");
  return actionOk(undefined, fileFields ? "Document and file updated." : "Document updated.");
}

export async function deletePdfAction(id: string): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const existing = await prisma.pdf.findUnique({ where: { id } });
  if (!existing) return actionError("That document no longer exists.");

  await prisma.pdf.delete({ where: { id } });
  await deletePdf(existing.storagePath).catch((error) => {
    console.error("[pdf] storage cleanup failed", error);
  });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_PDF_DELETED,
    detail: existing.title,
  });

  revalidatePath("/admin/pdfs");
  revalidatePath("/learn");
  return actionOk(undefined, "Document deleted.");
}
