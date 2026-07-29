import "server-only";
import { Prisma, TestStatus, type Occupation } from "@prisma/client";

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
    orderBy: { createdAt: "desc" },
    include: {
      bookmarks: { where: { userId }, select: { id: true } },
      views: { where: { userId }, select: { id: true } },
    },
  });

  return pdfs.map((pdf) => ({
    id: pdf.id,
    title: pdf.title,
    description: pdf.description,
    topic: pdf.topic,
    occupation: pdf.occupation,
    fileUrl: pdf.fileUrl,
    fileSize: pdf.fileSize,
    createdAt: pdf.createdAt,
    bookmarked: pdf.bookmarks.length > 0,
    viewed: pdf.views.length > 0,
  }));
}

/** PDFs recommended after a test, matched against the topics that were missed. */
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
              question: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
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
      question: answer.question.question,
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
        include: { question: true },
      },
    },
  });

  if (!test || test.status === TestStatus.IN_PROGRESS) return null;

  const correctCount = test.answers.filter((a) => a.correct).length;
  const answeredCount = test.answers.filter((a) => a.selectedAnswer !== null).length;

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
    breakdown: test.answers.map((answer) => ({
      questionId: answer.questionId,
      question: answer.question.question,
      topic: answer.question.topic,
      difficulty: answer.question.difficulty,
      selected: answer.selectedAnswer,
      correctAnswer: answer.question.correctAnswer,
      correct: answer.correct,
      explanation: answer.question.explanation,
      options: renderOptions(answer.question, answer.optionOrder),
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
