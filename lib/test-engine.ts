import "server-only";
import { AnswerOption, QuestionType, TestStatus, type Question } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { shuffle, round } from "@/lib/utils";
import {
  MARKS_PER_QUESTION,
  PASS_PERCENTAGE,
  TEST_DURATION_SECONDS,
  TEST_QUESTION_COUNT,
} from "@/lib/constants";

const MCQ_KEYS: AnswerOption[] = [
  AnswerOption.A,
  AnswerOption.B,
  AnswerOption.C,
  AnswerOption.D,
];
const TF_KEYS: AnswerOption[] = [AnswerOption.A, AnswerOption.B];

/** A per-attempt permutation of the option keys, e.g. `"C,A,D,B"`. */
export function buildOptionOrder(type: QuestionType): string {
  const keys = type === QuestionType.TRUE_FALSE ? TF_KEYS : MCQ_KEYS;
  return shuffle(keys).join(",");
}

export function parseOptionOrder(order: string): AnswerOption[] {
  return order
    .split(",")
    .map((k) => k.trim() as AnswerOption)
    .filter((k) => MCQ_KEYS.includes(k));
}

type OptionSource = Pick<Question, "optionA" | "optionB" | "optionC" | "optionD" | "type">;

/** Resolve the shuffled option keys into `{ value, label }` pairs for the UI. */
export function renderOptions(
  question: OptionSource,
  optionOrder: string,
): { value: AnswerOption; label: string }[] {
  const labels: Record<AnswerOption, string | null> = {
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  };

  return parseOptionOrder(optionOrder)
    .map((value) => ({ value, label: labels[value] ?? "" }))
    .filter((option) => option.label.trim().length > 0);
}

export function computePercentage(score: number, total: number): number {
  if (total <= 0) return 0;
  return round((score / total) * 100, 2);
}

export function computeStatus(percentage: number): TestStatus {
  return percentage >= PASS_PERCENTAGE ? TestStatus.PASSED : TestStatus.FAILED;
}

/**
 * Picks `TEST_QUESTION_COUNT` random active questions for an occupation.
 * Selection happens in the application layer so the behaviour is identical on
 * any Postgres version and easy to unit test.
 */
export async function pickRandomQuestionIds(occupation: Question["occupation"]) {
  const ids = await prisma.question.findMany({
    where: { occupation, active: true },
    select: { id: true },
  });
  return shuffle(ids.map((row) => row.id)).slice(0, TEST_QUESTION_COUNT);
}

/**
 * Grades an attempt and writes the final result. Safe to call more than once —
 * an already-submitted test is returned untouched, which is what makes the
 * "auto submit on timeout" and "submit" paths race-free.
 */
export async function finalizeTest(testId: string, autoSubmitted = false) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { answers: { include: { question: true } } },
  });
  if (!test) return null;
  if (test.status !== TestStatus.IN_PROGRESS) return test;

  const now = new Date();
  // The clock is authoritative on the server: a client that never called
  // submit still gets exactly the allotted duration counted against it.
  const effectiveEnd = now > test.expiresAt ? test.expiresAt : now;
  const timeTaken = Math.max(
    0,
    Math.min(
      Math.round((effectiveEnd.getTime() - test.startedAt.getTime()) / 1000),
      test.durationSec,
    ),
  );

  let score = 0;
  const updates = test.answers.map((answer) => {
    const correct = answer.selectedAnswer === answer.question.correctAnswer;
    if (correct) score += MARKS_PER_QUESTION; // no negative marking
    return prisma.testAnswer.update({
      where: { id: answer.id },
      data: { correct },
    });
  });

  const total = test.answers.length || TEST_QUESTION_COUNT;
  const percentage = computePercentage(score, total);

  const [updated] = await prisma.$transaction([
    prisma.test.update({
      where: { id: testId },
      data: {
        score,
        totalQuestions: total,
        percentage,
        status: computeStatus(percentage),
        timeTaken,
        submittedAt: now,
      },
    }),
    ...updates,
  ]);

  return { ...updated, autoSubmitted };
}

/**
 * Closes any attempt whose timer has run out. Called whenever a learner opens
 * the test area, which is what enforces "auto submit when the timer ends" even
 * if the browser was closed.
 */
export async function finalizeExpiredTests(userId: string) {
  const expired = await prisma.test.findMany({
    where: { userId, status: TestStatus.IN_PROGRESS, expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const test of expired) await finalizeTest(test.id, true);
  return expired.map((t) => t.id);
}

export function testDurationSeconds() {
  return TEST_DURATION_SECONDS;
}

/** Topics the learner answered incorrectly, most-missed first. */
export function weakTopicsFromAnswers(
  answers: { correct: boolean; question: { topic: string } }[],
): string[] {
  const misses = new Map<string, number>();
  for (const answer of answers) {
    if (answer.correct) continue;
    misses.set(answer.question.topic, (misses.get(answer.question.topic) ?? 0) + 1);
  }
  return [...misses.entries()].sort((a, b) => b[1] - a[1]).map(([topic]) => topic);
}
