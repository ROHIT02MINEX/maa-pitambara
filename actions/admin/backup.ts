"use server";

import { requireAdmin } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByKey, RATE_LIMITS } from "@/lib/rate-limit";
import { backupAllResults } from "@/lib/sheets-backup";
import { actionError, actionOk, type ActionResult } from "@/types";

/** Re-sends every completed attempt to the Google Sheet. Safe to re-run — the
 *  Apps Script skips test IDs it has already written. */
export async function syncSheetsBackupAction(): Promise<ActionResult<{ synced: number }>> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return actionError("Administrator access is required.");
  }

  const limit = limitByKey("export", admin.id, RATE_LIMITS.export.limit, RATE_LIMITS.export.windowMs);
  if (!limit.success) return actionError("Too many sync requests. Please wait a moment.");

  const result = await backupAllResults();
  if (!result.ok) return actionError(result.error ?? "Backup failed.");

  await logActivity({
    userId: admin.id,
    action: ACTIVITY.ADMIN_EXPORT,
    detail: `sheets sync (${result.synced} rows)`,
  });

  return actionOk(
    { synced: result.synced },
    result.synced === 0
      ? "Nothing to sync. No completed attempts yet."
      : `Sent ${result.synced} result row(s) to Google Sheets.`,
  );
}
