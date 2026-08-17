import "server-only";
import { Prisma, TestStatus, type Occupation, type Subject } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { renderOptions, weakTopicsFromAnswers } from "@/lib/test-engine";
import { round } from "@/lib/utils";
import type { ActiveTest, PdfListItem, TestResultView } from "@/types";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardData(userId: string, occupation: Occupation) {
  const [user, tests, totalPdfs, viewedPdfs, latestPdfs, activity, bookmarkCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, image: true, occupation: true, createdAt: true },
      }),
      prisma.test.findMany({
        where: { userId, status: { not: TestStatus.IN_PROGRESS } },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          score: true,
          totalQuestions: true,
          percentage: true,
          status: true,
          timeTaken: true,
          submittedAt: true,
        },
      }),
      prisma.pdf.count({ where: { occupation } }),
      prisma.pdfView.count({ where: { userId, pdf: { occupation } } }),
      prisma.pdf.findMany({
        where: { occupation },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          description: true,
          fileSize: true,
          createdAt: true,
          topic: true,
        },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, action: true, detail: true, createdAt: true },
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

  const completed = tests.length;
  const passed = tests.filter((t) => t.status === TestStatus.PASSED).length;
  const percentages = tests.map((t) => t.percentage);
  const averageScore = completed ? round(percentages.reduce((a, b) => a + b, 0) / completed, 1) : 0;
  const highestScore = completed ? round(Math.max(...percentages), 1) : 0;

  // Course completion blends how much material has been opened with the best
  // assessment result achieved so far.
  const materialProgress = totalPdfs > 0 ? viewedPdfs / totalPdfs : 0;
  const completionPercentage = round((materialProgress * 0.5 + (highestScore / 100) * 0.5) * 100, 0);

  return {
    user,
    stats: {
      totalTests: completed,
      completedTests: completed,
      passedTests: passed,
      failedTests: completed - passed,
      averageScore,
      highestScore,
      completionPercentage,
      pdfsAvailable: totalPdfs,
      pdfsViewed: viewedPdfs,
      bookmarks: bookmarkCount,
    },
    recentTests: tests.slice(0, 5),
    latestPdfs,
    activity,
  };
}

// ---------------------------------------------------------------------------
// Learning material
// ---------------------------------------------------------------------------

export async function getPdfsForUser(
  userId: string,
  occupation: Occupation,
  options: { q?: string; onlyBookmarked?: boolean } = {},
): Promise<PdfListItem[]> {
  const where: Prisma.PdfWhereInput = { occupation };

  if (options.q?.trim()) {
    const q = options.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ];
  }
  if (options.onlyBookmarked) {
    where.bookmarks = { some: { userId } };
  }

  const pdfs = await prisma.pdf.findMany({
    where,
    // Built-in NIMI banks first, then anything the institute has uploaded.
    orderBy: [{ builtIn: "desc" }, { year: "asc" }, { createdAt: "desc" }],
    include: {
      bookmarks: { where: { userId }, select: { id: true } },
      views: { where: { userId }, select: { id: true } },
      _count: { select: { questions: true } },
    },
  });

  return pdfs.map((pdf) => ({
    id: pdf.id,
    title: pdf.title,
    titleHi: pdf.titleHi,
    description: pdf.description,
    topic: pdf.topic,
    occupation: pdf.occupation,
    subject: pdf.subject,
    year: pdf.year,
    builtIn: pdf.builtIn,
    fileUrl: pdf.fileUrl,
    fileSize: pdf.fileSize,
    createdAt: pdf.createdAt,
    bookmarked: pdf.bookmarks.length > 0,
    viewed: pdf.views.length > 0,
    questionCount: pdf._count.questions,
  }));
}

/**
 * PDFs recommended for a set of weak topics.
 *
 * The test result no longer needs this — a question carries its own source
 * document, so the result page links straight to the page it came from. This
 * remains for questions with no recorded source (anything an administrator
 * added by hand) and for the dashboard's "what to read next" panel.
 */
export async function getSuggestedPdfs(occupation: Occupation, topics: string[], limit = 4) {
  if (topics.length === 0) return [];

  const suggestions = await prisma.pdf.findMany({
    where: {
      occupation,
      OR: topics.flatMap((topic) => [
        { topic: { equals: topic, mode: "insensitive" as const } },
        { title: { contains: topic, mode: "insensitive" as const } },
        { description: { contains: topic, mode: "insensitive" as const } },
      ]),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, topic: true, description: true, fileUrl: true },
  });

  // Nothing matched the weak topics — fall back to the newest material so the
  // learner is never left without a next step.
  if (suggestions.length > 0) return suggestions;

  return prisma.pdf.findMany({
    where: { occupation },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, topic: true, description: true, fileUrl: true },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** The learner-facing view of an in-flight attempt. Never exposes answers. */
export async function getActiveTest(testId: string, userId: string): Promise<ActiveTest | null> {
  const test = await prisma.test.findFirst({
    where: { id: testId, userId },
    include: {
      answers: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            select: {
              id: true,
              type: true,
              subject: true,
              topic: true,
              question: true,
              questionHi: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              optionAHi: true,
              optionBHi: true,
              optionCHi: true,
              optionDHi: true,
            },
          },
        },
      },
    },
  });

  if (!test || test.status !== TestStatus.IN_PROGRESS) return null;

  return {
    id: test.id,
    occupation: test.occupation,
    startedAt: test.startedAt.toISOString(),
    expiresAt: test.expiresAt.toISOString(),
    durationSec: test.durationSec,
    questions: test.answers.map((answer, index) => ({
      answerId: answer.id,
      questionId: answer.questionId,
      index,
      type: answer.question.type,
      subject: answer.question.subject,
      topic: answer.question.topic,
      question: answer.question.question,
      questionHi: answer.question.questionHi,
      options: renderOptions(answer.question, answer.optionOrder),
      selected: answer.selectedAnswer,
    })),
  };
}

export async function getTestResult(
  testId: string,
  userId: string,
): Promise<TestResultView | null> {
  const test = await prisma.test.findFirst({
    where: { id: testId, userId },
    include: {
      answers: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              sourcePdf: { select: { id: true, title: true, titleHi: true, fileUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!test || test.status === TestStatus.IN_PROGRESS) return null;

  const correctCount = test.answers.filter((a) => a.correct).length;
  const answeredCount = test.answers.filter((a) => a.selectedAnswer !== null).length;

  // Per-subject score, mirroring the four papers of the real trade test.
  const subjectTotals = new Map<Subject, { correct: number; total: number }>();
  for (const answer of test.answers) {
    const bucket = subjectTotals.get(answer.question.subject) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answer.correct) bucket.correct += 1;
    subjectTotals.set(answer.question.subject, bucket);
  }

  // Study plan: every document a missed question came from, with the pages to
  // revise. Keyed by document id so one entry covers all misses from that PDF.
  const plans = new Map<
    string,
    {
      pdfId: string | null;
      title: string;
      titleHi: string | null;
      fileUrl: string | null;
      missed: number;
      topics: Set<string>;
      pages: Set<number>;
    }
  >();

  for (const answer of test.answers) {
    if (answer.correct) continue;
    const pdf = answer.question.sourcePdf;
    const key = pdf?.id ?? `topic:${answer.question.topic}`;

    const entry = plans.get(key) ?? {
      pdfId: pdf?.id ?? null,
      title: pdf?.title ?? "Ask your instructor",
      titleHi: pdf?.titleHi ?? null,
      fileUrl: pdf?.fileUrl ?? null,
      missed: 0,
      topics: new Set<string>(),
      pages: new Set<number>(),
    };
    entry.missed += 1;
    entry.topics.add(answer.question.topic);
    if (answer.question.sourcePage) entry.pages.add(answer.question.sourcePage);
    plans.set(key, entry);
  }

  return {
    id: test.id,
    occupation: test.occupation,
    score: test.score,
    totalQuestions: test.totalQuestions,
    percentage: test.percentage,
    status: test.status,
    timeTaken: test.timeTaken,
    submittedAt: test.submittedAt,
    correctCount,
    wrongCount: answeredCount - correctCount,
    unansweredCount: test.answers.length - answeredCount,
    weakTopics: weakTopicsFromAnswers(test.answers),
    subjectBreakdown: [...subjectTotals.entries()]
      .map(([subject, value]) => ({ subject, ...value }))
      .sort((a, b) => b.total - a.total),
    studyPlan: [...plans.values()]
      .sort((a, b) => b.missed - a.missed)
      .map((entry) => ({
        pdfId: entry.pdfId,
        title: entry.title,
        titleHi: entry.titleHi,
        fileUrl: entry.fileUrl,
        missed: entry.missed,
        topics: [...entry.topics],
        pages: [...entry.pages].sort((a, b) => a - b),
      })),
    breakdown: test.answers.map((answer) => ({
      questionId: answer.questionId,
      question: answer.question.question,
      questionHi: answer.question.questionHi,
      topic: answer.question.topic,
      subject: answer.question.subject,
      difficulty: answer.question.difficulty,
      selected: answer.selectedAnswer,
      correctAnswer: answer.question.correctAnswer,
      correct: answer.correct,
      explanation: answer.question.explanation,
      explanationHi: answer.question.explanationHi,
      options: renderOptions(answer.question, answer.optionOrder),
      source: {
        pdfId: answer.question.sourcePdf?.id ?? null,
        title: answer.question.sourcePdf?.title ?? null,
        titleHi: answer.question.sourcePdf?.titleHi ?? null,
        fileUrl: answer.question.sourcePdf?.fileUrl ?? null,
        page: answer.question.sourcePage,
        label: answer.question.sourceLabel,
        syllabusWeek: answer.question.syllabusWeek,
      },
    })),
  };
}

export async function getTestHistory(userId: string, take = 50) {
  return prisma.test.findMany({
    where: { userId, status: { not: TestStatus.IN_PROGRESS } },
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      id: true,
      score: true,
      totalQuestions: true,
      percentage: true,
      status: true,
      timeTaken: true,
      submittedAt: true,
      occupation: true,
    },
  });
}

export async function getInProgressTest(userId: string) {
  return prisma.test.findFirst({
    where: { userId, status: TestStatus.IN_PROGRESS },
    orderBy: { startedAt: "desc" },
    select: { id: true, expiresAt: true, startedAt: true },
  });
}

export async function getQuestionBankSize(occupation: Occupation) {
  return prisma.question.count({ where: { occupation, active: true } });
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function getProgressData(userId: string, occupation: Occupation) {
  const [tests, totalPdfs, viewedPdfs] = await Promise.all([
    prisma.test.findMany({
      where: { userId, status: { not: TestStatus.IN_PROGRESS } },
      orderBy: { submittedAt: "asc" },
      include: { answers: { select: { correct: true, question: { select: { topic: true } } } } },
    }),
    prisma.pdf.count({ where: { occupation } }),
    prisma.pdfView.count({ where: { userId, pdf: { occupation } } }),
  ]);

  const total = tests.length;
  const passed = tests.filter((t) => t.status === TestStatus.PASSED).length;
  const percentages = tests.map((t) => t.percentage);
  const averageScore = total ? round(percentages.reduce((a, b) => a + b, 0) / total, 1) : 0;
  const highestScore = total ? round(Math.max(...percentages), 1) : 0;
  const materialProgress = totalPdfs > 0 ? viewedPdfs / totalPdfs : 0;

  // Accuracy per topic across every attempt — drives the "focus areas" panel.
  const topicTotals = new Map<string, { correct: number; total: number }>();
  for (const test of tests) {
    for (const answer of test.answers) {
      const bucket = topicTotals.get(answer.question.topic) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (answer.correct) bucket.correct += 1;
      topicTotals.set(answer.question.topic, bucket);
    }
  }

  const topicAccuracy = [...topicTotals.entries()]
    .map(([topic, value]) => ({
      topic,
      accuracy: value.total ? round((value.correct / value.total) * 100, 0) : 0,
      attempts: value.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return {
    totals: {
      totalTests: total,
      passed,
      failed: total - passed,
      averageScore,
      highestScore,
      completionPercentage: round((materialProgress * 0.5 + (highestScore / 100) * 0.5) * 100, 0),
      materialViewed: viewedPdfs,
      materialTotal: totalPdfs,
    },
    timeline: tests.map((test, index) => ({
      attempt: index + 1,
      label: test.submittedAt
        ? test.submittedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : `#${index + 1}`,
      percentage: test.percentage,
      score: test.score,
      status: test.status,
      id: test.id,
    })),
    topicAccuracy,
  };
}
