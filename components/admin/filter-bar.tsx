"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

export type FilterOption = { value: string; label: string };
export type FilterSelect = {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
};

const ALL = "__all__";

/**
 * URL-driven filter bar shared by every admin list. Keeping state in the query
 * string makes filtered views linkable and keeps the server as the source of
 * truth for pagination.
 */
export function FilterBar({
  searchPlaceholder = "Search…",
  selects = [],
  showDateRange = false,
  children,
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  showDateRange?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQuery);
  const debouncedQuery = useDebounce(query);

  const setParam = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page"); // any filter change resets to the first page
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (debouncedQuery === initialQuery) return;
    setParam({ q: debouncedQuery || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const activeCount = [...searchParams.keys()].filter(
    (key) => !["page", "perPage"].includes(key),
  ).length;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1 space-y-1.5">
        <Label htmlFor="filter-search" className="text-xs text-muted-foreground">
          Search
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="filter-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>

      {selects.map((select) => (
        <div key={select.key} className="w-[190px] space-y-1.5">
          <Label htmlFor={`filter-${select.key}`} className="text-xs text-muted-foreground">
            {select.label}
          </Label>
          <Select
            value={searchParams.get(select.key) ?? ALL}
            onValueChange={(value) => setParam({ [select.key]: value === ALL ? undefined : value })}
          >
            <SelectTrigger id={`filter-${select.key}`}>
              <SelectValue placeholder={select.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{select.placeholder}</SelectItem>
              {select.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {showDateRange ? (
        <>
          <div className="w-[160px] space-y-1.5">
            <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="filter-from"
              type="date"
              value={searchParams.get("from") ?? ""}
              onChange={(event) => setParam({ from: event.target.value || undefined })}
            />
          </div>
          <div className="w-[160px] space-y-1.5">
            <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="filter-to"
              type="date"
              value={searchParams.get("to") ?? ""}
              onChange={(event) => setParam({ to: event.target.value || undefined })}
            />
          </div>
        </>
      ) : null}

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("");
            router.replace(pathname, { scroll: false });
          }}
        >
          <X className="h-4 w-4" /> Clear
        </Button>
      ) : null}

      <div className="ml-auto flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}
