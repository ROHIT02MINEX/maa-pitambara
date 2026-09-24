"use server";

import { revalidatePath } from "next/cache";
import { AnswerOption, TestStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByKey, RATE_LIMITS } from "@/lib/rate-limit";
import { TEST_DURATION_SECONDS, TEST_QUESTION_COUNT } from "@/lib/constants";
import {
  buildOptionOrder,
  finalizeExpiredTests,
  finalizeTest,
  pickRandomQuestionIds,
} from "@/lib/test-engine";
import { backupTestResult } from "@/lib/sheets-backup";
import { actionError, actionOk, type ActionResult } from "@/types";

const saveAnswerSchema = z.object({
  testId: z.string().min(1),
  questionId: z.string().min(1),
  selectedAnswer: z.nativeEnum(AnswerOption).nullable(),
});

/**
 * Starts a new attempt, or resumes the one already in flight.
 * Resuming is what makes refreshing the page unable to reset the timer:
 * `expiresAt` is fixed at creation time and lives in the database.
 */
export async function startTestAction(): Promise<ActionResult<{ testId: string }>> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");
  if (!sessionUser.occupation) return actionError("Complete your profile to take a test.");

  // Keyed on the learner, not the IP — a whole computer lab shares one address.
  const limit = limitByKey(
    "startTest",
    sessionUser.id,
    RATE_LIMITS.startTest.limit,
    RATE_LIMITS.startTest.windowMs,
  );
  if (!limit.success) {
    return actionError(`Too many attempts started. Try again in ${limit.retryAfter}s.`);
  }

  // Close anything whose timer already ran out before deciding what to do.
  await finalizeExpiredTests(sessionUser.id);

  const active = await prisma.test.findFirst({
    where: { userId: sessionUser.id, status: TestStatus.IN_PROGRESS },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (active) return actionOk({ testId: active.id }, "Resuming your test in progress.");


  const questionIds = await pickRandomQuestionIds(sessionUser.occupation);
  if (questionIds.length < TEST_QUESTION_COUNT) {
    return actionError(
      `This test needs ${TEST_QUESTION_COUNT} questions but only ${questionIds.length} are available for your trade. Please contact your administrator.`,
    );
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, type: true },
  });
  const typeById = new Map(questions.map((q) => [q.id, q.type]));

  const now = new Date();
  const test = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sessionUser.id}, 0)) IS NULL AS locked`;
    const existing = await tx.test.findFirst({ where: { userId: sessionUser.id, status: TestStatus.IN_PROGRESS }, select: { id: true } });
    if (existing) return existing;
    return tx.test.create({
    data: {
      userId: sessionUser.id,
      occupation: sessionUser.occupation!,
      totalQuestions: questionIds.length,
      durationSec: TEST_DURATION_SECONDS,
      startedAt: now,
      expiresAt: new Date(now.getTime() + TEST_DURATION_SECONDS * 1000),
      answers: {
        create: questionIds.map((questionId, index) => ({
          questionId,
          orderIndex: index,
          optionOrder: buildOptionOrder(typeById.get(questionId)!),
        })),
      },
    },
    select: { id: true },
    });
  }, { timeout: 15000 });


  await logActivity({ userId: sessionUser.id, action: ACTIVITY.TEST_STARTED, detail: test.id });
  revalidatePath("/tests");
  return actionOk({ testId: test.id });
}

/** Persists a single answer. Answers are never graded here. */
export async function saveAnswerAction(input: unknown): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const limit = limitByKey(
    "saveAnswer",
    sessionUser.id,
    RATE_LIMITS.saveAnswer.limit,
    RATE_LIMITS.saveAnswer.windowMs,
  );
  if (!limit.success) return actionError("Too many requests. Please slow down.");

  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid answer payload.");

  const { testId, questionId, selectedAnswer } = parsed.data;

  const test = await prisma.test.findFirst({
    where: { id: testId, userId: sessionUser.id },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!test) return actionError("Test not found.");
  if (test.status !== TestStatus.IN_PROGRESS) {
    return actionError("This test has already been submitted and cannot be changed.");
  }
  if (test.expiresAt < new Date()) {
    await finalizeTest(testId, true);
    return actionError("Time is up. Your test has been submitted automatically.");
  }

  const answer = await prisma.testAnswer.findUnique({
    where: { testId_questionId: { testId, questionId } },
    select: { id: true },
  });
  if (!answer) return actionError("That question is not part of this test.");

  await prisma.testAnswer.update({
    where: { id: answer.id },
    data: { selectedAnswer, answeredAt: selectedAnswer ? new Date() : null },
  });

  return actionOk();
}

/** Grades and closes the attempt. Idempotent. */
export async function submitTestAction(
  testId: string,
  auto = false,
): Promise<ActionResult<{ testId: string }>> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const test = await prisma.test.findFirst({
    where: { id: testId, userId: sessionUser.id },
    select: { id: true, status: true },
  });
  if (!test) return actionError("Test not found.");

  if (test.status !== TestStatus.IN_PROGRESS) {
    // Already submitted — send the learner to their result rather than erroring.
    return actionOk({ testId }, "This test was already submitted.");
  }

  await finalizeTest(testId, auto);

  // Best-effort spreadsheet backup. Never allowed to fail the submission.
  await backupTestResult(testId);

  await logActivity({
    userId: sessionUser.id,
    action: auto ? ACTIVITY.TEST_AUTO_SUBMITTED : ACTIVITY.TEST_SUBMITTED,
    detail: testId,
  });

  revalidatePath("/tests");
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return actionOk({ testId }, auto ? "Time is up. Your test was submitted." : "Test submitted.");
}
