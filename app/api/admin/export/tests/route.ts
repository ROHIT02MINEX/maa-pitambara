import { adminGuard, jsonError } from "@/middleware/api-guard";
import { getAnalyticsForExport } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { occupationLabel } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
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
import type { AnalyticsRow } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS: ExportColumn<AnalyticsRow>[] = [
  { header: "Name", value: (row) => row.name ?? "", width: 24 },
  { header: "Email", value: (row) => row.email, width: 30 },
  { header: "Phone", value: (row) => row.phone ?? "", width: 16 },
  { header: "Occupation", value: (row) => occupationLabel(row.occupation), width: 20 },
  { header: "Score", value: (row) => `${row.score}/${row.totalQuestions}`, width: 12 },
  { header: "Percentage", value: (row) => row.percentage, width: 14 },
  { header: "Correct", value: (row) => row.correct, width: 10 },
  { header: "Wrong", value: (row) => row.wrong, width: 10 },
  { header: "Time taken", value: (row) => formatDuration(row.timeTaken), width: 14 },
  { header: "Status", value: (row) => (row.status === "PASSED" ? "Passed" : "Failed"), width: 12 },
  {
    header: "Date",
    value: (row) => row.createdAt.toLocaleString("en-IN"),
    width: 22,
  },
];

/** CSV / Excel / PDF export of the test-analytics view, honouring its filters. */
export const GET = adminGuard(
  async (req, ctx) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "csv";
    if (!(format in EXPORT_CONTENT_TYPES)) {
      return jsonError("Unsupported export format. Use csv, xlsx or pdf.", 400);
    }

    const filter = parseListFilter(Object.fromEntries(url.searchParams.entries()));
    const rows = await getAnalyticsForExport(filter);

    const typed = format as keyof typeof EXPORT_CONTENT_TYPES;
    const filename = exportFilename("test-analytics", typed);

    let body: Buffer | string;
    if (typed === "csv") body = buildCsv(COLUMNS, rows);
    else if (typed === "xlsx") body = await buildXlsx(COLUMNS, rows, "Test analytics");
    else
      body = buildPdf(COLUMNS, rows, {
        title: "Test analytics report",
        subtitle: `Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} attempt(s)`,
      });

    await logActivity({
      userId: ctx.user.id,
      action: ACTIVITY.ADMIN_EXPORT,
      detail: `tests.${typed} (${rows.length} rows)`,
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
