import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth";
import { listTestAnalytics } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { OCCUPATIONS, OCCUPATION_LABELS, occupationLabel } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { ExportButtons } from "@/components/admin/export-buttons";
import { ScoreRangeFilter } from "@/components/admin/score-range-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Test analytics" };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filter = parseListFilter(await searchParams);
  const result = await listTestAnalytics(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Test analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Every submitted attempt, with the learner&apos;s contact details and result. Filters apply
          to exports too.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Attempts</CardTitle>
          <CardDescription>{result.total} attempt(s) match the current filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense fallback={<TableSkeleton rows={1} cols={5} />}>
            <FilterBar
              searchPlaceholder="Search by learner name, e-mail or phone…"
              selects={[
                {
                  key: "occupation",
                  label: "Occupation",
                  placeholder: "All occupations",
                  options: OCCUPATIONS.map((occupation) => ({
                    value: occupation,
                    label: OCCUPATION_LABELS[occupation],
                  })),
                },
                {
                  key: "status",
                  label: "Result",
                  placeholder: "Passed and failed",
                  options: [
                    { value: "passed", label: "Passed only" },
                    { value: "failed", label: "Failed only" },
                  ],
                },
              ]}
              showDateRange
            >
              <ScoreRangeFilter />
              <ExportButtons resource="tests" />
            </FilterBar>
          </Suspense>

          {result.items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No attempts match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Wrong</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((row) => (
                  <TableRow key={row.testId}>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate font-medium">{row.name ?? "Unnamed"}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.phone ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{occupationLabel(row.occupation)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium tabular-nums">
                      {row.score}/{row.totalQuestions}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.percentage}%</TableCell>
                    <TableCell className="tabular-nums text-success">{row.correct}</TableCell>
                    <TableCell className="tabular-nums text-destructive">{row.wrong}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDuration(row.timeTaken)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "PASSED" ? "success" : "destructive"}>
                        {row.status === "PASSED" ? "Passed" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(row.createdAt, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Suspense fallback={null}>
            <PaginationNav
              page={result.page}
              perPage={result.perPage}
              total={result.total}
              totalPages={result.totalPages}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
