import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/queries/admin";
import { parseListFilter } from "@/lib/search-params";
import { OCCUPATIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { UserTable } from "@/components/admin/user-table";
import { ExportButtons } from "@/components/admin/export-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Manage users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const filter = parseListFilter(await searchParams);
  const result = await listUsers(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-muted-foreground">
          Search, edit, disable or remove accounts and issue password resets.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All accounts</CardTitle>
          <CardDescription>{result.total} user(s) match the current filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense fallback={<TableSkeleton rows={1} cols={4} />}>
            <FilterBar
              searchPlaceholder="Search by name, e-mail or phone…"
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
                  label: "Status",
                  placeholder: "Everyone",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "disabled", label: "Disabled" },
                    { value: "admins", label: "Administrators" },
                    { value: "unverified", label: "Unverified e-mail" },
                  ],
                },
              ]}
              showDateRange
            >
              <ExportButtons resource="users" formats={["csv", "xlsx"]} />
            </FilterBar>
          </Suspense>

          <UserTable users={result.items} currentAdminId={admin.id} />

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
