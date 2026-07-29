"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Format = "csv" | "xlsx" | "pdf";

/**
 * Triggers a server-generated export that respects the filters currently in
 * the URL, so what you see is exactly what you download.
 */
export function ExportButtons({
  resource,
  formats = ["csv", "xlsx", "pdf"],
}: {
  resource: "tests" | "users";
  formats?: Format[];
}) {
  const searchParams = useSearchParams();
  const [busy, setBusy] = React.useState<Format | null>(null);

  async function download(format: Format) {
    setBusy(format);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("perPage");
      params.set("format", format);

      const response = await fetch(`/api/admin/export/${resource}?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `${resource}-export.${format}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} export ready.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  const meta: Record<Format, { label: string; icon: typeof FileText }> = {
    csv: { label: "CSV (.csv)", icon: Table2 },
    xlsx: { label: "Excel (.xlsx)", icon: FileSpreadsheet },
    pdf: { label: "PDF (.pdf)", icon: FileText },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" loading={Boolean(busy)}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download current view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => {
          const Icon = meta[format].icon;
          return (
            <DropdownMenuItem key={format} onSelect={() => download(format)}>
              <Icon /> {meta[format].label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
