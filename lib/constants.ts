import { Occupation, Difficulty, QuestionType, TestStatus } from "@prisma/client";

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
  email: "mppitijhs@gmail.com",
  phone: "+91 98892 16678",
  portalName: "Skill Learning & Assessment Portal",
} as const;

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
