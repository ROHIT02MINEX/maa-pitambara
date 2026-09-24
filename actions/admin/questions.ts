"use server";

import { revalidatePath } from "next/cache";
import { AnswerOption, Difficulty, Occupation, QuestionType, Subject } from "@prisma/client";
import Papa from "papaparse";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByIp, RATE_LIMITS } from "@/lib/rate-limit";
import { questionCsvRowSchema, questionSchema } from "@/lib/validations/content";
import { actionError, actionOk, type ActionResult } from "@/types";

async function guard() {
  try {
    const admin = await requireAdmin();
    const limit = await limitByIp("mutation", RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
    if (!limit.success) return { ok: false as const, error: "Too many requests. Please slow down." };
    return { ok: true as const, admin };
  } catch {
    return { ok: false as const, error: "Administrator access is required." };
  }
}

function toRecord(data: z.infer<typeof questionSchema>) {
  const isTrueFalse = data.type === QuestionType.TRUE_FALSE;
  return {
    occupation: data.occupation,
    subject: data.subject,
    topic: data.topic,
    type: data.type,
    question: data.question,
    questionHi: data.questionHi || null,
    optionAHi: isTrueFalse ? "सही" : data.optionAHi || null,
    optionBHi: isTrueFalse ? "गलत" : data.optionBHi || null,
    optionCHi: isTrueFalse ? null : data.optionCHi || null,
    optionDHi: isTrueFalse ? null : data.optionDHi || null,
    explanationHi: data.explanationHi || null,
    optionA: isTrueFalse ? "True" : data.optionA,
    optionB: isTrueFalse ? "False" : data.optionB,
    optionC: isTrueFalse ? null : data.optionC || null,
    optionD: isTrueFalse ? null : data.optionD || null,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation || null,
    difficulty: data.difficulty,
    active: data.active,
  };
}

export async function createQuestionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const question = await prisma.question.create({
    data: toRecord(parsed.data),
    select: { id: true },
  });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_QUESTION_CREATED,
    detail: parsed.data.question.slice(0, 120),
  });

  revalidatePath("/admin/questions");
  return actionOk({ id: question.id }, "Question added.");
}

export async function updateQuestionAction(id: string, input: unknown): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);
  if (!id) return actionError("Missing question id.");

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const exists = await prisma.question.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return actionError("That question no longer exists.");

  await prisma.question.update({ where: { id }, data: toRecord(parsed.data) });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_QUESTION_UPDATED,
    detail: parsed.data.question.slice(0, 120),
  });

  revalidatePath("/admin/questions");
  return actionOk(undefined, "Question updated.");
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  const existing = await prisma.question.findUnique({ where: { id }, select: { question: true } });
  if (!existing) return actionError("That question no longer exists.");

  // Historic attempts reference questions; deleting cascades to those answers,
  // so past results stay internally consistent.
  await prisma.question.delete({ where: { id } });

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_QUESTION_DELETED,
    detail: existing.question.slice(0, 120),
  });

  revalidatePath("/admin/questions");
  return actionOk(undefined, "Question deleted.");
}

export async function toggleQuestionActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  await prisma.question.update({ where: { id }, data: { active } });
  revalidatePath("/admin/questions");
  return actionOk(undefined, active ? "Question activated." : "Question deactivated.");
}

// ---------------------------------------------------------------------------
// CSV bulk import
// ---------------------------------------------------------------------------

const OCCUPATION_ALIASES: Record<string, Occupation> = {
  fitter: Occupation.FITTER,
  electrician: Occupation.ELECTRICIAN,
  solar: Occupation.SOLAR_TECHNICIAN,
  solartechnician: Occupation.SOLAR_TECHNICIAN,
  solar_technician: Occupation.SOLAR_TECHNICIAN,
  cosmetology: Occupation.BASIC_COSMETOLOGY,
  basiccosmetology: Occupation.BASIC_COSMETOLOGY,
  basic_cosmetology: Occupation.BASIC_COSMETOLOGY,
};

function parseOccupation(value: string): Occupation | null {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return OCCUPATION_ALIASES[key] ?? OCCUPATION_ALIASES[key.replace(/_/g, "")] ?? null;
}

function parseAnswer(value: string): AnswerOption | null {
  const key = value.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(key)) return key as AnswerOption;
  if (["TRUE", "T", "YES", "1"].includes(key)) return AnswerOption.A;
  if (["FALSE", "F", "NO", "0"].includes(key)) return AnswerOption.B;
  return null;
}

function parseDifficulty(value?: string): Difficulty {
  const key = (value ?? "").trim().toUpperCase();
  return key in Difficulty ? (key as Difficulty) : Difficulty.EASY;
}

function parseType(value?: string): QuestionType {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s/-]+/g, "_");
  if (["TRUE_FALSE", "TF", "BOOLEAN"].includes(key)) return QuestionType.TRUE_FALSE;
  return QuestionType.MCQ;
}

const SUBJECT_ALIASES: Record<string, Subject> = {
  TRADE_THEORY: Subject.TRADE_THEORY,
  THEORY: Subject.TRADE_THEORY,
  TRADE: Subject.TRADE_THEORY,
  WORKSHOP_CALCULATION: Subject.WORKSHOP_CALCULATION,
  WORKSHOP: Subject.WORKSHOP_CALCULATION,
  CALCULATION: Subject.WORKSHOP_CALCULATION,
  WORKSHOP_CALCULATION_AND_SCIENCE: Subject.WORKSHOP_CALCULATION,
  ENGINEERING_DRAWING: Subject.ENGINEERING_DRAWING,
  DRAWING: Subject.ENGINEERING_DRAWING,
  EMPLOYABILITY_SKILLS: Subject.EMPLOYABILITY_SKILLS,
  EMPLOYABILITY: Subject.EMPLOYABILITY_SKILLS,
};

/** Blank or unrecognised subjects fall back to trade theory, the largest paper. */
function parseSubject(value?: string): Subject {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s/&-]+/g, "_");
  return SUBJECT_ALIASES[key] ?? Subject.TRADE_THEORY;
}

export type ImportSummary = {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

/**
 * Bulk-imports questions from CSV text.
 *
 * Expected header:
 * `occupation,subject,topic,type,question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty`
 *
 * `subject` is optional for backwards compatibility with sheets exported before
 * the AITT subject split; those rows import as trade theory.
 */
export async function importQuestionsAction(csvText: string): Promise<ActionResult<ImportSummary>> {
  const gate = await guard();
  if (!gate.ok) return actionError(gate.error);

  if (!csvText?.trim()) return actionError("The uploaded file is empty.");
  if (csvText.length > 4_000_000) return actionError("That file is too large (4 MB limit).");

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (parsed.errors.length && parsed.data.length === 0) {
    return actionError(`Could not read the CSV: ${parsed.errors[0]?.message ?? "unknown error"}`);
  }

  const summary: ImportSummary = { inserted: 0, skipped: 0, errors: [] };
  const records: ReturnType<typeof toRecord>[] = [];

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for the header, +1 for 1-based numbering
    const shape = questionCsvRowSchema.safeParse(raw);
    if (!shape.success) {
      summary.skipped += 1;
      summary.errors.push({ row: rowNumber, message: "Missing required columns." });
      return;
    }

    const occupation = parseOccupation(shape.data.occupation);
    const correctAnswer = parseAnswer(shape.data.correct_answer);
    if (!occupation) {
      summary.skipped += 1;
      summary.errors.push({ row: rowNumber, message: `Unknown occupation "${shape.data.occupation}".` });
      return;
    }
    if (!correctAnswer) {
      summary.skipped += 1;
      summary.errors.push({ row: rowNumber, message: `Unknown answer "${shape.data.correct_answer}".` });
      return;
    }

    const type = parseType(shape.data.type);
    const candidate = questionSchema.safeParse({
      occupation,
      subject: parseSubject(shape.data.subject),
      topic: shape.data.topic,
      type,
      question: shape.data.question,
      questionHi: shape.data.question_hi,
      optionAHi: shape.data.option_a_hi,
      optionBHi: shape.data.option_b_hi,
      optionCHi: shape.data.option_c_hi,
      optionDHi: shape.data.option_d_hi,
      explanationHi: shape.data.explanation_hi,
      optionA: type === QuestionType.TRUE_FALSE ? shape.data.option_a || "True" : shape.data.option_a,
      optionB: type === QuestionType.TRUE_FALSE ? shape.data.option_b || "False" : shape.data.option_b,
      optionC: shape.data.option_c ?? "",
      optionD: shape.data.option_d ?? "",
      correctAnswer,
      explanation: shape.data.explanation ?? "",
      difficulty: parseDifficulty(shape.data.difficulty),
      active: true,
    });

    if (!candidate.success) {
      summary.skipped += 1;
      const issue = candidate.error.issues[0];
      summary.errors.push({
        row: rowNumber,
        message: `${issue?.path.join(".") ?? "row"}: ${issue?.message ?? "invalid"}`,
      });
      return;
    }

    records.push(toRecord(candidate.data));
  });

  if (records.length === 0) {
    return actionError(
      summary.errors[0]
        ? `No rows could be imported. First problem at row ${summary.errors[0].row}: ${summary.errors[0].message}`
        : "No rows could be imported.",
    );
  }

  const result = await prisma.question.createMany({ data: records });
  summary.inserted = result.count;

  await logActivity({
    userId: gate.admin.id,
    action: ACTIVITY.ADMIN_QUESTIONS_IMPORTED,
    detail: `${summary.inserted} imported, ${summary.skipped} skipped`,
  });

  revalidatePath("/admin/questions");
  return actionOk(summary, `Imported ${summary.inserted} question(s).`);
}
