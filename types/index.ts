import type {
  AnswerOption,
  Difficulty,
  Occupation,
  QuestionType,
  Role,
  Subject,
  TestStatus,
} from "@prisma/client";

/** Uniform result contract for every Server Action in the app. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

export type DashboardStats = {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  averageScore: number;
  highestScore: number;
  completionPercentage: number;
  pdfsAvailable: number;
  pdfsViewed: number;
};

export type PdfListItem = {
  id: string;
  title: string;
  titleHi: string | null;
  description: string | null;
  topic: string | null;
  occupation: Occupation;
  subject: Subject | null;
  year: string | null;
  builtIn: boolean;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
  bookmarked: boolean;
  viewed: boolean;
  /** How many bank questions were drawn from this document. */
  questionCount: number;
};

/** An option as shown to the learner. `labelHi` is null on English-only banks. */
export type QuestionOptionView = {
  value: AnswerOption;
  label: string;
  labelHi: string | null;
};

export type TestQuestionView = {
  answerId: string;
  questionId: string;
  index: number;
  type: QuestionType;
  subject: Subject;
  topic: string;
  question: string;
  questionHi: string | null;
  /** Already shuffled for this attempt. `value` is the canonical option key. */
  options: QuestionOptionView[];
  selected: AnswerOption | null;
};

export type ActiveTest = {
  id: string;
  occupation: Occupation;
  startedAt: string;
  expiresAt: string;
  durationSec: number;
  questions: TestQuestionView[];
};

/**
 * Where a question came from, so a wrong answer can send the learner to the
 * exact page of the exact document instead of "go and read something".
 */
export type StudyReference = {
  pdfId: string | null;
  title: string | null;
  titleHi: string | null;
  fileUrl: string | null;
  page: number | null;
  label: string | null;
  syllabusWeek: string | null;
};

export type TestResultView = {
  id: string;
  occupation: Occupation;
  score: number;
  totalQuestions: number;
  percentage: number;
  status: TestStatus;
  timeTaken: number;
  submittedAt: Date | null;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  weakTopics: string[];
  /** Per-subject score, matching the four papers of the AITT test. */
  subjectBreakdown: { subject: Subject; correct: number; total: number }[];
  /** Documents to revise, built from the questions that were missed. */
  studyPlan: {
    pdfId: string | null;
    title: string;
    titleHi: string | null;
    fileUrl: string | null;
    missed: number;
    topics: string[];
    pages: number[];
  }[];
  breakdown: {
    questionId: string;
    question: string;
    questionHi: string | null;
    topic: string;
    subject: Subject;
    difficulty: Difficulty;
    selected: AnswerOption | null;
    correctAnswer: AnswerOption;
    correct: boolean;
    explanation: string | null;
    explanationHi: string | null;
    options: QuestionOptionView[];
    source: StudyReference;
  }[];
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  occupation: Occupation | null;
  role: Role;
  disabled: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  testsTaken: number;
};

export type AnalyticsRow = {
  testId: string;
  name: string | null;
  email: string;
  phone: string | null;
  occupation: Occupation;
  score: number;
  totalQuestions: number;
  percentage: number;
  correct: number;
  wrong: number;
  timeTaken: number;
  status: TestStatus;
  createdAt: Date;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
