import { z } from "zod";
import { AnswerOption, Difficulty, Occupation, QuestionType, Subject } from "@prisma/client";
import { MAX_PAGE_SIZE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------------

export const pdfMetaSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  occupation: z.nativeEnum(Occupation, {
    errorMap: () => ({ message: "Select an occupation" }),
  }),
  topic: z.string().trim().max(80).optional().or(z.literal("")),
});

export const pdfUpdateSchema = pdfMetaSchema.extend({
  id: z.string().min(1),
});

export type PdfMetaInput = z.infer<typeof pdfMetaSchema>;

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const baseQuestionSchema = z.object({
  occupation: z.nativeEnum(Occupation, {
    errorMap: () => ({ message: "Select an occupation" }),
  }),
  // Which of the four AITT papers this belongs to; drives the test blueprint.
  subject: z.nativeEnum(Subject).default(Subject.TRADE_THEORY),
  topic: z.string().trim().min(2, "Topic is required").max(80),
  type: z.nativeEnum(QuestionType).default(QuestionType.MCQ),
  question: z.string().trim().min(8, "Question must be at least 8 characters").max(1000),
  optionA: z.string().trim().min(1, "Option A is required").max(300),
  optionB: z.string().trim().min(1, "Option B is required").max(300),
  optionC: z.string().trim().max(300).optional().or(z.literal("")),
  optionD: z.string().trim().max(300).optional().or(z.literal("")),
  correctAnswer: z.nativeEnum(AnswerOption, {
    errorMap: () => ({ message: "Select the correct answer" }),
  }),
  explanation: z.string().trim().max(1000).optional().or(z.literal("")),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.EASY),
  active: z.boolean().default(true),
});

/**
 * MCQ needs four options; True/False needs exactly two and the answer must be
 * A or B. Enforced here so the same rule applies to the form, the server
 * action and the CSV importer.
 */
export const questionSchema = baseQuestionSchema.superRefine((data, ctx) => {
  if (data.type === QuestionType.MCQ) {
    if (!data.optionC?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["optionC"], message: "Option C is required for MCQ" });
    }
    if (!data.optionD?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["optionD"], message: "Option D is required for MCQ" });
    }
  } else {
    if (data.correctAnswer !== AnswerOption.A && data.correctAnswer !== AnswerOption.B) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "True/False answers must be A (True) or B (False)",
      });
    }
  }
});

export const questionUpdateSchema = z.intersection(
  questionSchema,
  z.object({ id: z.string().min(1) }),
);

export type QuestionInput = z.infer<typeof questionSchema>;

/** Shape of a single row in the CSV bulk importer. */
export const questionCsvRowSchema = z.object({
  occupation: z.string().trim(),
  subject: z.string().trim().optional(),
  topic: z.string().trim(),
  type: z.string().trim().optional(),
  question: z.string().trim(),
  option_a: z.string().trim(),
  option_b: z.string().trim(),
  option_c: z.string().trim().optional(),
  option_d: z.string().trim().optional(),
  correct_answer: z.string().trim(),
  explanation: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Listing / filtering
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

export const listFilterSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  occupation: z.nativeEnum(Occupation).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
});

export type ListFilter = z.infer<typeof listFilterSchema>;
