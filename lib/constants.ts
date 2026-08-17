import { Occupation, Difficulty, QuestionType, Subject, TestStatus } from "@prisma/client";

/**
 * Institute identity. Details verified against the UP government ITI register
 * (update.vppup.in, ITI code 2627) rather than typed from memory.
 */
export const INSTITUTE = {
  name: "Maa Pitambra Private ITI",
  shortName: "Maa Pitambra ITI",
  city: "Jhansi",
  address:
    "Behind Hero JMK Showroom, Shivpuri Road, Nandanpura, Jhansi, Uttar Pradesh 284003",
  scvtCode: "2627",
  ncvtCode: "PU09001984",
  affiliation: "NCVT & SCVT affiliated",
  approval: "Approved by DGT, Ministry of Skill Development & Entrepreneurship, Government of India",
  email: "mppitijhs@gmail.com",
  phone: "+91 98892 16678",
  portalName: "Skill Learning & Assessment Portal",
  /** Both mottoes appear on the institute seal. */
  motto: "Skill Today, Success Tomorrow",
  mottoHi: "कौशल से समृद्धि, युवा से विकसित भारत",
} as const;

/** The four pillars on the seal, reused as the landing page's promise. */
export const INSTITUTE_PILLARS = [
  { label: "Skill", labelHi: "कौशल" },
  { label: "Knowledge", labelHi: "ज्ञान" },
  { label: "Employment", labelHi: "रोज़गार" },
  { label: "Better Future", labelHi: "बेहतर भविष्य" },
] as const;

/** Single source of truth for the four supported trades. */
export const OCCUPATIONS = [
  Occupation.FITTER,
  Occupation.ELECTRICIAN,
  Occupation.SOLAR_TECHNICIAN,
  Occupation.BASIC_COSMETOLOGY,
] as const;

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  FITTER: "Fitter",
  ELECTRICIAN: "Electrician",
  SOLAR_TECHNICIAN: "Solar Technician",
  BASIC_COSMETOLOGY: "Basic Cosmetology",
};

export const OCCUPATION_DESCRIPTIONS: Record<Occupation, string> = {
  FITTER: "Bench work, fitting, measurement and mechanical maintenance.",
  ELECTRICIAN: "Wiring, machines, safety practice and electrical measurement.",
  SOLAR_TECHNICIAN: "PV modules, installation, inverters and system maintenance.",
  BASIC_COSMETOLOGY: "Skin, hair, hygiene, salon safety and client care.",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: "Multiple choice",
  TRUE_FALSE: "True / False",
};

// ---------------------------------------------------------------------------
// Subjects (the four papers of an AITT trade test)
// ---------------------------------------------------------------------------

export const SUBJECTS = [
  Subject.TRADE_THEORY,
  Subject.WORKSHOP_CALCULATION,
  Subject.ENGINEERING_DRAWING,
  Subject.EMPLOYABILITY_SKILLS,
] as const;

export const SUBJECT_LABELS: Record<Subject, string> = {
  TRADE_THEORY: "Trade Theory",
  WORKSHOP_CALCULATION: "Workshop Calculation & Science",
  ENGINEERING_DRAWING: "Engineering Drawing",
  EMPLOYABILITY_SKILLS: "Employability Skills",
};

export const SUBJECT_LABELS_HI: Record<Subject, string> = {
  TRADE_THEORY: "ट्रेड थ्योरी",
  WORKSHOP_CALCULATION: "वर्कशॉप कैलकुलेशन एवं साइंस",
  ENGINEERING_DRAWING: "इंजीनियरिंग ड्रॉइंग",
  EMPLOYABILITY_SKILLS: "रोज़गार कौशल",
};

export const SUBJECT_SHORT_LABELS: Record<Subject, string> = {
  TRADE_THEORY: "Theory",
  WORKSHOP_CALCULATION: "Calculation",
  ENGINEERING_DRAWING: "Drawing",
  EMPLOYABILITY_SKILLS: "Employability",
};

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
};

export const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  IN_PROGRESS: "In progress",
  PASSED: "Passed",
  FAILED: "Failed",
};

export function occupationLabel(occupation?: Occupation | null): string {
  return occupation ? OCCUPATION_LABELS[occupation] : "Not selected";
}

// ---------------------------------------------------------------------------
// Assessment rules
// ---------------------------------------------------------------------------

/** Questions drawn at random per attempt. */
export const TEST_QUESTION_COUNT = 20;
/** Timer length, in seconds (30 minutes). */
export const TEST_DURATION_SECONDS = 30 * 60;
/** Marks per question. No negative marking. */
export const MARKS_PER_QUESTION = 1;
/** Percentage required to pass. */
export const PASS_PERCENTAGE = 70;
/** Derived: minimum correct answers required to pass a full-length test. */
export const PASS_MARK = Math.ceil((PASS_PERCENTAGE / 100) * TEST_QUESTION_COUNT);

/**
 * Subject mix of a generated paper, scaled from the 75-question AITT paper
 * (≈50 trade theory, 10 workshop calculation, 5 engineering drawing,
 * 10 employability skills). Drawing uniformly from the whole bank would swamp
 * a test with employability questions, because that bank is shared by every
 * trade and is therefore the largest one.
 *
 * Weights are a target, not a quota: if a trade has too few questions in one
 * subject the shortfall is refilled from the others (see `pickTestQuestions`).
 */
export const TEST_BLUEPRINT: { subject: Subject; weight: number }[] = [
  { subject: Subject.TRADE_THEORY, weight: 0.65 },
  { subject: Subject.WORKSHOP_CALCULATION, weight: 0.15 },
  { subject: Subject.ENGINEERING_DRAWING, weight: 0.05 },
  { subject: Subject.EMPLOYABILITY_SKILLS, weight: 0.15 },
];

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_PDF_MIME = "application/pdf";
export const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "pdfs";

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
