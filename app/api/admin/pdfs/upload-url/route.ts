import { NextResponse } from "next/server";
import { Occupation } from "@prisma/client";
import { z } from "zod";

import { adminGuard, jsonError } from "@/middleware/api-guard";
import { createSignedUpload } from "@/lib/storage";
import { ALLOWED_PDF_MIME, MAX_PDF_BYTES } from "@/lib/constants";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  occupation: z.nativeEnum(Occupation),
  size: z.number().int().positive().max(MAX_PDF_BYTES, "That file is larger than the 25 MB limit."),
  contentType: z.string().max(120),
});

/**
 * Issues a one-time signed upload URL so the browser can send the PDF straight
 * to Supabase Storage, bypassing the serverless request-body limit.
 */
export const POST = adminGuard(
  async (req) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    if (parsed.data.contentType !== ALLOWED_PDF_MIME) {
      return jsonError("Only PDF files can be uploaded.", 400);
    }

    try {
      const upload = await createSignedUpload(parsed.data.occupation, parsed.data.filename);
      return NextResponse.json(upload);
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Could not create an upload URL.",
        500,
      );
    }
  },
  { rateLimit: { action: "upload", ...RATE_LIMITS.upload } },
);
