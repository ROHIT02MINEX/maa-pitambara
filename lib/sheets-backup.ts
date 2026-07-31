import "server-only";
import { TestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { occupationLabel } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

/**
 * Google Sheets backup.
 *
 * Posts result rows to a Google Apps Script Web App, which appends them to a
 * sheet. Apps Script is used rather than the Sheets API on purpose: it needs no
 * service account, no OAuth and no key management — the deployment URL is the
 * only secret, and the script runs as the sheet's owner.
 *
 * See `google-apps-script/sheets-backup.gs` for the script to deploy.
 */
export function isSheetsBackupConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL);
}

export type TestResultRow = {
  testId: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correct: number;
  wrong: number;
  unanswered: number;
  timeTaken: string;
  status: string;
  submittedAt: string;
};

async function post(rows: TestResultRow[]): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return { ok: false, error: "GOOGLE_SHEETS_WEBHOOK_URL is not set." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.GOOGLE_SHEETS_SHARED_SECRET ?? "",
        rows,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, error: `Sheets responded ${response.status}` };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error posting to Sheets",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Shapes one finished attempt into a spreadsheet row. */
export async function buildResultRow(testId: string): Promise<TestResultRow | null> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      score: true,
      totalQuestions: true,
      percentage: true,
      status: true,
      timeTaken: true,
      submittedAt: true,
      createdAt: true,
      occupation: true,
      user: { select: { name: true, email: true, phone: true } },
      answers: { select: { correct: true, selectedAnswer: true } },
    },
  });
  if (!test || test.status === TestStatus.IN_PROGRESS) return null;

  const correct = test.answers.filter((a) => a.correct).length;
  const answered = test.answers.filter((a) => a.selectedAnswer !== null).length;

  return {
    testId: test.id,
    name: test.user.name ?? "",
    email: test.user.email,
    phone: test.user.phone ?? "",
    occupation: occupationLabel(test.occupation),
    score: test.score,
    totalQuestions: test.totalQuestions,
    percentage: test.percentage,
    correct,
    wrong: answered - correct,
    unanswered: test.answers.length - answered,
    timeTaken: formatDuration(test.timeTaken),
    status: test.status === TestStatus.PASSED ? "Passed" : "Failed",
    submittedAt: (test.submittedAt ?? test.createdAt).toISOString(),
  };
}

/**
 * Fire-and-forget backup of a single attempt.
 *
 * Deliberately never throws: a learner's submission must not fail because a
 * spreadsheet was unreachable. The database stays the system of record.
 */
export async function backupTestResult(testId: string): Promise<void> {
  if (!isSheetsBackupConfigured()) return;

  try {
    const row = await buildResultRow(testId);
    if (!row) return;
    const result = await post([row]);
    if (!result.ok) console.error("[sheets] backup failed:", result.error);
  } catch (error) {
    console.error("[sheets] backup threw:", error);
  }
}

/** Full re-sync, used by the admin button. Returns a reportable summary. */
export async function backupAllResults(limit = 5000) {
  if (!isSheetsBackupConfigured()) {
    return { ok: false as const, synced: 0, error: "Google Sheets backup is not configured." };
  }

  const tests = await prisma.test.findMany({
    where: { status: { not: TestStatus.IN_PROGRESS } },
    orderBy: { submittedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const rows: TestResultRow[] = [];
  for (const test of tests) {
    const row = await buildResultRow(test.id);
    if (row) rows.push(row);
  }
  if (rows.length === 0) return { ok: true as const, synced: 0 };

  // Chunked so a large cohort does not exceed the Apps Script payload limit.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await post(rows.slice(i, i + CHUNK));
    if (!result.ok) return { ok: false as const, synced: i, error: result.error };
  }

  return { ok: true as const, synced: rows.length };
}
