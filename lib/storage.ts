import "server-only";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase";
import { ALLOWED_PDF_MIME, MAX_PDF_BYTES, PDF_BUCKET } from "@/lib/constants";
import { slugifyFilename } from "@/lib/utils";

/**
 * Uploads go straight from the admin's browser to Supabase Storage using a
 * short-lived signed URL. That keeps large files away from the serverless
 * function body limit and means the file never transits our own compute.
 */
export async function createSignedUpload(occupation: string, originalName: string) {
  const supabase = supabaseAdmin();

  const safeName = slugifyFilename(originalName) || "document.pdf";
  const withExt = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  const objectPath = `${occupation.toLowerCase()}/${randomUUID()}-${withExt}`;

  const { data, error } = await supabase.storage.from(PDF_BUCKET).createSignedUploadUrl(objectPath);
  if (error || !data) throw new Error(error?.message ?? "Could not create an upload URL.");

  return { path: data.path, token: data.token, signedUrl: data.signedUrl, bucket: PDF_BUCKET };
}

export type StoredObject = { size: number; mimeType: string };

/**
 * Confirms an object really exists in the bucket and matches our constraints.
 * Called before a database row is written so a client cannot register a
 * metadata-only "PDF" that points at nothing (or at an oversized file).
 */
export async function verifyStoredPdf(objectPath: string): Promise<StoredObject> {
  const supabase = supabaseAdmin();

  const lastSlash = objectPath.lastIndexOf("/");
  const dir = lastSlash === -1 ? "" : objectPath.slice(0, lastSlash);
  const filename = lastSlash === -1 ? objectPath : objectPath.slice(lastSlash + 1);

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .list(dir, { search: filename, limit: 100 });
  if (error) throw new Error(`Storage lookup failed: ${error.message}`);

  const object = data?.find((item) => item.name === filename);
  if (!object) throw new Error("The uploaded file could not be found in storage.");

  const size = Number(object.metadata?.size ?? 0);
  const mimeType = String(object.metadata?.mimetype ?? "");

  if (mimeType && mimeType !== ALLOWED_PDF_MIME) {
    await supabase.storage.from(PDF_BUCKET).remove([objectPath]);
    throw new Error("Only PDF files can be uploaded.");
  }
  if (size > MAX_PDF_BYTES) {
    await supabase.storage.from(PDF_BUCKET).remove([objectPath]);
    throw new Error("That file is larger than the 25 MB limit.");
  }

  return { size, mimeType: mimeType || ALLOWED_PDF_MIME };
}

export function publicPdfUrl(objectPath: string): string {
  return supabaseAdmin().storage.from(PDF_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}
