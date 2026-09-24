
import { T } from "@/components/translated-text";
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
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Test analytics"}</T></h1>
        <p className="mt-1 text-muted-foreground"><T>{" Every submitted attempt, with the learner's contact details and result. Filters apply to exports too. "}</T></p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle><T>{"Attempts"}</T></CardTitle>
          <CardDescription><T>{result.total}</T><T>{" attempt(s) match the current filters."}</T></CardDescription>
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
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"><T>{" No attempts match these filters. "}</T></p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><T>{"Learner"}</T></TableHead>
                  <TableHead><T>{"Phone"}</T></TableHead>
                  <TableHead><T>{"Occupation"}</T></TableHead>
                  <TableHead><T>{"Score"}</T></TableHead>
                  <TableHead><T>{"%"}</T></TableHead>
                  <TableHead><T>{"Correct"}</T></TableHead>
                  <TableHead><T>{"Wrong"}</T></TableHead>
                  <TableHead><T>{"Time"}</T></TableHead>
                  <TableHead><T>{"Status"}</T></TableHead>
                  <TableHead><T>{"Date"}</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((row) => (
                  <TableRow key={row.testId}>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate font-medium"><T>{row.name ?? "Unnamed"}</T></p>
                      <p className="truncate text-xs text-muted-foreground"><T>{row.email}</T></p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap"><T>{row.phone ?? "-"}</T></TableCell>
                    <TableCell>
                      <Badge variant="secondary"><T>{occupationLabel(row.occupation)}</T></Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium tabular-nums">
                      <T>{row.score}</T><T>{"/"}</T><T>{row.totalQuestions}</T>
                    </TableCell>
                    <TableCell className="tabular-nums"><T>{row.percentage}</T><T>{"%"}</T></TableCell>
                    <TableCell className="tabular-nums text-success"><T>{row.correct}</T></TableCell>
                    <TableCell className="tabular-nums text-destructive"><T>{row.wrong}</T></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      <T>{formatDuration(row.timeTaken)}</T>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "PASSED" ? "success" : "destructive"}>
                        <T>{row.status === "PASSED" ? "Passed" : "Failed"}</T>
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <T>{formatDate(row.createdAt, true)}</T>
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
