import { adminGuard, jsonError } from "@/middleware/api-guard";
import { getUsersForExport } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { occupationLabel } from "@/lib/constants";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { RATE_LIMITS } from "@/lib/rate-limit";
import {
  buildCsv,
  buildPdf,
  buildXlsx,
  EXPORT_CONTENT_TYPES,
  exportFilename,
  type ExportColumn,
} from "@/lib/exporters";
import type { AdminUserRow } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS: ExportColumn<AdminUserRow>[] = [
  { header: "Name", value: (row) => row.name ?? "", width: 24 },
  { header: "Email", value: (row) => row.email, width: 30 },
  { header: "Phone", value: (row) => row.phone ?? "", width: 16 },
  { header: "Occupation", value: (row) => occupationLabel(row.occupation), width: 20 },
  { header: "Role", value: (row) => (row.role === "ADMIN" ? "Administrator" : "Learner"), width: 16 },
  { header: "Status", value: (row) => (row.disabled ? "Disabled" : "Active"), width: 12 },
  { header: "Email verified", value: (row) => (row.emailVerified ? "Yes" : "No"), width: 14 },
  { header: "Tests taken", value: (row) => row.testsTaken, width: 12 },
  { header: "Joined", value: (row) => row.createdAt.toLocaleDateString("en-IN"), width: 16 },
  {
    header: "Last login",
    value: (row) => (row.lastLoginAt ? row.lastLoginAt.toLocaleString("en-IN") : "Never"),
    width: 22,
  },
];

export const GET = adminGuard(
  async (req, ctx) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";
    if (!(format in EXPORT_CONTENT_TYPES)) {
      return jsonError("Unsupported export format. Use csv, xlsx or pdf.", 400);
    }

    const filter = parseListFilter(Object.fromEntries(url.searchParams.entries()));
    const rows = await getUsersForExport(filter);

    const typed = format as keyof typeof EXPORT_CONTENT_TYPES;
    const filename = exportFilename("users", typed);

    let body: Buffer | string;
    if (typed === "csv") body = buildCsv(COLUMNS, rows);
    else if (typed === "xlsx") body = await buildXlsx(COLUMNS, rows, "Users");
    else
      body = buildPdf(COLUMNS, rows, {
        title: "User report",
        subtitle: `Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} user(s)`,
      });

    await logActivity({
      userId: ctx.user.id,
      action: ACTIVITY.ADMIN_EXPORT,
      detail: `users.${typed} (${rows.length} rows)`,
    });

    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": EXPORT_CONTENT_TYPES[typed],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { csrf: false, rateLimit: { action: "export", ...RATE_LIMITS.export } },
);
