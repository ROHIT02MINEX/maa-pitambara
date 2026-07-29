import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth";
import { listQuestions } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { DIFFICULTY_LABELS, OCCUPATIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { QuestionManager } from "@/components/admin/question-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Question bank" };

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filter = parseListFilter(await searchParams);
  const result = await listQuestions(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Question bank</h1>
        <p className="mt-1 text-muted-foreground">
          Each occupation has its own bank. Tests draw 20 active questions at random.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {result.total} question(s) match the current filters.
            {result.topics.length > 0 ? (
              <span className="mt-2 flex flex-wrap gap-1.5">
                {result.topics.slice(0, 12).map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense fallback={<TableSkeleton rows={1} cols={4} />}>
            <FilterBar
              searchPlaceholder="Search question text, topic or explanation…"
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
                  key: "difficulty",
                  label: "Difficulty",
                  placeholder: "Any difficulty",
                  options: Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                },
                {
                  key: "status",
                  label: "State",
                  placeholder: "All questions",
                  options: [
                    { value: "active", label: "Active only" },
                    { value: "inactive", label: "Inactive only" },
                  ],
                },
              ]}
            />
          </Suspense>

          <QuestionManager questions={result.items} />

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
