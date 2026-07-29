import "server-only";
import { Prisma, Role, TestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { round } from "@/lib/utils";
import { OCCUPATIONS } from "@/lib/constants";
import type { AdminUserRow, AnalyticsRow, ListFilterLike, Paginated } from "@/types/admin";

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getAdminOverview() {
  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    totalPdfs,
    totalQuestions,
    completedTests,
    inProgressTests,
    aggregate,
    byOccupation,
    recentLogins,
    recentAttempts,
    passCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { disabled: false } }),
    prisma.user.count({ where: { disabled: true } }),
    prisma.pdf.count(),
    prisma.question.count(),
    prisma.test.count({ where: { status: { not: TestStatus.IN_PROGRESS } } }),
    prisma.test.count({ where: { status: TestStatus.IN_PROGRESS } }),
    prisma.test.aggregate({
      where: { status: { not: TestStatus.IN_PROGRESS } },
      _avg: { percentage: true, timeTaken: true },
    }),
    prisma.user.groupBy({ by: ["occupation"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, occupation: true, lastLoginAt: true, image: true },
    }),
    prisma.test.findMany({
      where: { status: { not: TestStatus.IN_PROGRESS } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        percentage: true,
        score: true,
        totalQuestions: true,
        status: true,
        submittedAt: true,
        occupation: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.test.count({ where: { status: TestStatus.PASSED } }),
  ]);

  const occupationCounts = OCCUPATIONS.map((occupation) => ({
    occupation,
    users: byOccupation.find((row) => row.occupation === occupation)?._count._all ?? 0,
  }));

  // Per-occupation average score, for the admin dashboard chart.
  const perOccupationScores = await prisma.test.groupBy({
    by: ["occupation"],
    where: { status: { not: TestStatus.IN_PROGRESS } },
    _avg: { percentage: true },
    _count: { _all: true },
  });

  return {
    totals: {
      totalUsers,
      activeUsers,
      disabledUsers,
      totalPdfs,
      totalQuestions,
      completedTests,
      inProgressTests,
      averageScore: round(aggregate._avg.percentage ?? 0, 1),
      averageTime: Math.round(aggregate._avg.timeTaken ?? 0),
      passRate: completedTests ? round((passCount / completedTests) * 100, 1) : 0,
      unassignedUsers:
        totalUsers - occupationCounts.reduce((sum, row) => sum + row.users, 0),
    },
    occupationCounts,
    occupationScores: OCCUPATIONS.map((occupation) => ({
      occupation,
      average: round(
        perOccupationScores.find((row) => row.occupation === occupation)?._avg.percentage ?? 0,
        1,
      ),
      attempts: perOccupationScores.find((row) => row.occupation === occupation)?._count._all ?? 0,
    })),
    recentLogins,
    recentAttempts,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function paginate(filter: ListFilterLike) {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filter.perPage ?? 10));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

function wrap<T>(items: T[], total: number, page: number, perPage: number): Paginated<T> {
  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

function dateRange(from?: string, to?: string) {
  const range: Prisma.DateTimeFilter = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
  }
  return Object.keys(range).length ? range : undefined;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(filter: ListFilterLike): Promise<Paginated<AdminUserRow>> {
  const { page, perPage, skip, take } = paginate(filter);

  const where: Prisma.UserWhereInput = {};
  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (filter.occupation) where.occupation = filter.occupation;
  if (filter.status === "disabled") where.disabled = true;
  if (filter.status === "active") where.disabled = false;
  if (filter.status === "admins") where.role = Role.ADMIN;
  if (filter.status === "unverified") where.emailVerified = null;

  const created = dateRange(filter.from, filter.to);
  if (created) where.createdAt = created;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        occupation: true,
        role: true,
        disabled: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { tests: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return wrap(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      occupation: row.occupation,
      role: row.role,
      disabled: row.disabled,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      testsTaken: row._count.tests,
    })),
    total,
    page,
    perPage,
  );
}

// ---------------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------------

export async function listPdfs(filter: ListFilterLike) {
  const { page, perPage, skip, take } = paginate(filter);

  const where: Prisma.PdfWhereInput = {};
  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.occupation) where.occupation = filter.occupation;

  const [items, total] = await Promise.all([
    prisma.pdf.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        uploadedBy: { select: { name: true, email: true } },
        _count: { select: { views: true, bookmarks: true } },
      },
    }),
    prisma.pdf.count({ where }),
  ]);

  return wrap(items, total, page, perPage);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function listQuestions(filter: ListFilterLike) {
  const { page, perPage, skip, take } = paginate(filter);

  const where: Prisma.QuestionWhereInput = {};
  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { question: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
      { explanation: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.occupation) where.occupation = filter.occupation;
  if (filter.difficulty) where.difficulty = filter.difficulty;
  if (filter.status === "active") where.active = true;
  if (filter.status === "inactive") where.active = false;

  const [items, total, topics] = await Promise.all([
    prisma.question.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where: filter.occupation ? { occupation: filter.occupation } : {},
      select: { topic: true },
      distinct: ["topic"],
      orderBy: { topic: "asc" },
    }),
  ]);

  return { ...wrap(items, total, page, perPage), topics: topics.map((t) => t.topic) };
}

// ---------------------------------------------------------------------------
// Test analytics
// ---------------------------------------------------------------------------

function analyticsWhere(filter: ListFilterLike): Prisma.TestWhereInput {
  const where: Prisma.TestWhereInput = { status: { not: TestStatus.IN_PROGRESS } };

  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.user = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    };
  }
  if (filter.occupation) where.occupation = filter.occupation;
  if (filter.status === "passed") where.status = TestStatus.PASSED;
  if (filter.status === "failed") where.status = TestStatus.FAILED;

  const submitted = dateRange(filter.from, filter.to);
  if (submitted) where.submittedAt = submitted;

  if (filter.minScore !== undefined || filter.maxScore !== undefined) {
    where.percentage = {
      ...(filter.minScore !== undefined ? { gte: filter.minScore } : {}),
      ...(filter.maxScore !== undefined ? { lte: filter.maxScore } : {}),
    };
  }

  return where;
}

const analyticsSelect = {
  id: true,
  score: true,
  totalQuestions: true,
  percentage: true,
  status: true,
  timeTaken: true,
  createdAt: true,
  submittedAt: true,
  occupation: true,
  user: { select: { name: true, email: true, phone: true } },
  _count: { select: { answers: true } },
  answers: { select: { correct: true, selectedAnswer: true } },
} satisfies Prisma.TestSelect;

type AnalyticsRecord = Prisma.TestGetPayload<{ select: typeof analyticsSelect }>;

function toAnalyticsRow(test: AnalyticsRecord): AnalyticsRow {
  const correct = test.answers.filter((a) => a.correct).length;
  const answered = test.answers.filter((a) => a.selectedAnswer !== null).length;
  return {
    testId: test.id,
    name: test.user.name,
    email: test.user.email,
    phone: test.user.phone,
    occupation: test.occupation,
    score: test.score,
    totalQuestions: test.totalQuestions,
    percentage: test.percentage,
    correct,
    wrong: answered - correct,
    timeTaken: test.timeTaken,
    status: test.status,
    createdAt: test.submittedAt ?? test.createdAt,
  };
}

export async function listTestAnalytics(filter: ListFilterLike): Promise<Paginated<AnalyticsRow>> {
  const { page, perPage, skip, take } = paginate(filter);
  const where = analyticsWhere(filter);

  const [rows, total] = await Promise.all([
    prisma.test.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip,
      take,
      select: analyticsSelect,
    }),
    prisma.test.count({ where }),
  ]);

  return wrap(rows.map(toAnalyticsRow), total, page, perPage);
}

/** Unpaginated variant used by the CSV / Excel / PDF exporters. */
export async function getAnalyticsForExport(filter: ListFilterLike, cap = 5000) {
  const rows = await prisma.test.findMany({
    where: analyticsWhere(filter),
    orderBy: { submittedAt: "desc" },
    take: cap,
    select: analyticsSelect,
  });
  return rows.map(toAnalyticsRow);
}

export async function getUsersForExport(filter: ListFilterLike, cap = 5000) {
  const result = await listUsers({ ...filter, page: 1, perPage: Math.min(cap, 100) });
  if (result.total <= result.items.length) return result.items;

  // Walk the remaining pages so exports are never silently truncated.
  const all = [...result.items];
  for (let page = 2; page <= result.totalPages && all.length < cap; page++) {
    const next = await listUsers({ ...filter, page, perPage: 100 });
    all.push(...next.items);
  }
  return all.slice(0, cap);
}

export async function getActivityFeed(take = 50) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      detail: true,
      ip: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}
