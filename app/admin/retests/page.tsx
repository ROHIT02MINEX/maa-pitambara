import type { Metadata } from "next";
import { Suspense } from "react";
import { RetestStatus, TestStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseListFilter } from "@/lib/search-params";
import { OCCUPATIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { RetestTable } from "@/components/admin/retest-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Retest requests" };

export default async function AdminRetestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filter = parseListFilter(await searchParams);

  const where = {
    ...(filter.occupation ? { occupation: filter.occupation } : {}),
    ...(filter.status && filter.status in RetestStatus
      ? { status: filter.status as RetestStatus }
      : {}),
    ...(filter.q?.trim()
      ? {
          user: {
            OR: [
              { name: { contains: filter.q.trim(), mode: "insensitive" as const } },
              { email: { contains: filter.q.trim(), mode: "insensitive" as const } },
              { phone: { contains: filter.q.trim() } },
            ],
          },
        }
      : {}),
  };

  const page = filter.page ?? 1;
  const perPage = filter.perPage ?? 10;

  const [rows, total, pendingCount] = await Promise.all([
    prisma.retestRequest.findMany({
      where,
      // Pending first so the queue is actionable, then newest.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        userId: true,
        status: true,
        reason: true,
        adminNote: true,
        occupation: true,
        createdAt: true,
        reviewedAt: true,
        consumedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            _count: { select: { tests: true } },
          },
        },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.retestRequest.count({ where }),
    prisma.retestRequest.count({ where: { status: RetestStatus.PENDING } }),
  ]);

  // `_count.tests` includes an in-progress attempt; show completed ones only.
  const inProgressByUser = await prisma.test.groupBy({
    by: ["userId"],
    where: { status: TestStatus.IN_PROGRESS },
    _count: { _all: true },
  });
  const inProgressMap = new Map(inProgressByUser.map((r) => [r.userId, r._count._all]));

  const items = rows.map((row) => ({
    id: row.id,
    status: row.status,
    reason: row.reason,
    adminNote: row.adminNote,
    occupation: row.occupation,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    consumedAt: row.consumedAt,
    user: { name: row.user.name, email: row.user.email, phone: row.user.phone },
    reviewedBy: row.reviewedBy,
    // An attempt still in progress hasn't been "used" yet — excluding it keeps
    // this column consistent with the learner's own attempt counter.
    attemptsUsed: row.user._count.tests - (inProgressMap.get(row.userId) ?? 0),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Retest requests</h1>
        <p className="mt-1 text-muted-foreground">
          Learners get one attempt. Approving a request grants exactly one more —
          it is consumed the moment they start it.
          {pendingCount > 0 ? ` ${pendingCount} awaiting review.` : ""}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>{total} request(s) match the current filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense fallback={<TableSkeleton rows={1} cols={4} />}>
            <FilterBar
              searchPlaceholder="Search by learner name, e-mail or phone…"
              selects={[
                {
                  key: "status",
                  label: "Status",
                  placeholder: "All statuses",
                  options: [
                    { value: "PENDING", label: "Pending" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "REJECTED", label: "Rejected" },
                  ],
                },
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

          <RetestTable rows={items} />

          <Suspense fallback={null}>
            <PaginationNav
              page={page}
              perPage={perPage}
              total={total}
              totalPages={Math.max(1, Math.ceil(total / perPage))}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
