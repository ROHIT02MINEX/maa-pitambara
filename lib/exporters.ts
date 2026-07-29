import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { toCsv } from "@/lib/utils";

export type ExportColumn<T> = {
  header: string;
  /** Value used in CSV/Excel (typed) and stringified for PDF. */
  value: (row: T) => string | number | Date | null;
  width?: number;
};

export function buildCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  return toCsv(
    columns.map((column) => column.header),
    rows.map((row) =>
      columns.map((column) => {
        const value = column.value(row);
        return value instanceof Date ? value.toISOString() : value;
      }),
    ),
  );
}

export async function buildXlsx<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  sheetName = "Export",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skill Learning & Assessment Portal";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width ?? Math.max(14, column.header.length + 4),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.value(row)));
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildPdf<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  options: { title: string; subtitle?: string },
): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(options.title, 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    options.subtitle ?? `Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} row(s)`,
    40,
    58,
  );

  autoTable(doc, {
    startY: 74,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) =>
      columns.map((column) => {
        const value = column.value(row);
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toLocaleString("en-IN");
        return String(value);
      }),
    ),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    margin: { left: 40, right: 40 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export const EXPORT_CONTENT_TYPES = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

/** `report-2026-07-28.csv` — safe for a Content-Disposition header. */
export function exportFilename(base: string, format: keyof typeof EXPORT_CONTENT_TYPES) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-${stamp}.${format}`;
}
