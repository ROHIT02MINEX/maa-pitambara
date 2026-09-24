
import { T } from "@/components/translated-text";
import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth";
import { listPdfs } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { envStatus } from "@/lib/env";
import { OCCUPATIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { PdfManager } from "@/components/admin/pdf-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Manage PDFs" };

export default async function AdminPdfsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filter = parseListFilter(await searchParams);
  const result = await listPdfs(filter);
  const storageReady = envStatus().storage;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Learning material"}</T></h1>
        <p className="mt-1 text-muted-foreground"><T>{" Upload, edit, replace and remove the PDFs each trade can see. "}</T></p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle><T>{"Documents"}</T></CardTitle>
          <CardDescription><T>{result.total}</T><T>{" document(s) match the current filters."}</T></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense fallback={<TableSkeleton rows={1} cols={3} />}>
            <FilterBar
              searchPlaceholder="Search by title, topic or description…"
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
              ]}
            />
          </Suspense>

          <PdfManager pdfs={result.items} storageReady={storageReady} />

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
