"use client";
import { T } from "@/components/translated-text";


import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PaginationNav({
  page,
  perPage,
  total,
  totalPages,
}: {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite"><T>{" Showing "}</T><strong className="text-foreground"><T>{first}</T></strong><T>{"– "}</T><strong className="text-foreground"><T>{last}</T></strong><T>{" of"}</T><T>{" "}</T>
        <strong className="text-foreground"><T>{total}</T></strong>
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground"><T>{"Rows"}</T></span>
          <Select value={String(perPage)} onValueChange={(value) => go({ perPage: value, page: "1" })}>
            <SelectTrigger className="h-9 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  <T>{size}</T>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => go({ page: String(page - 1) })}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm tabular-nums">
            <T>{page}</T><T>{" / "}</T><T>{totalPages}</T>
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => go({ page: String(page + 1) })}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
