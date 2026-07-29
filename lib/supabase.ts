import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PDF_BUCKET } from "@/lib/constants";

let client: SupabaseClient | null = null;

/**
 * Service-role Supabase client. It bypasses RLS, so it is only ever created on
 * the server and only used from admin-guarded code paths.
 */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export type UploadedFile = {
  path: string;
  publicUrl: string;
  size: number;
};

/** Upload a PDF and return its storage path plus a public URL. */
export async function uploadPdf(
  file: File | Blob,
  objectPath: string,
  contentType = "application/pdf",
): Promise<UploadedFile> {
  const supabase = supabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(PDF_BUCKET).upload(objectPath, buffer, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(objectPath);
  return { path: objectPath, publicUrl: data.publicUrl, size: buffer.byteLength };
}

export async function deletePdf(objectPath: string): Promise<void> {
  if (!objectPath) return;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([objectPath]);
  // A missing object is not an error worth failing the whole request over.
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Signed URL for private buckets. Falls back to the public URL when the bucket
 * is public (Supabase returns an error for public buckets in some versions).
 */
export async function signedPdfUrl(objectPath: string, expiresInSec = 60 * 60): Promise<string> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(objectPath, expiresInSec);
  if (error || !data?.signedUrl) {
    return supabase.storage.from(PDF_BUCKET).getPublicUrl(objectPath).data.publicUrl;
  }
  return data.signedUrl;
}
