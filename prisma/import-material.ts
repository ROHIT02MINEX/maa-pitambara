/**
 * Imports the official NIMI / DGT question banks that ship with the portal.
 *
 * Run with:  npm run db:import-material
 *
 * The source PDFs live in `public/study-material/` and are served straight from
 * the app, so a learner can open the exact page a question came from without
 * any storage configuration. Two things are written:
 *
 *   1. a `Pdf` row per document per occupation (`builtIn: true`), which makes
 *      the documents appear in the normal study library; and
 *   2. the parsed questions, each linked back to the `Pdf` row and the page it
 *      was printed on.
 *
 * The script is idempotent. Questions are keyed by `importKey` (a hash of the
 * question and its options), so re-running it updates the existing rows rather
 * than duplicating them, and it never touches questions an administrator has
 * added by hand.
 *
 * Regenerating `prisma/data/question-bank.json` from the PDFs is a separate,
 * offline step — see `scripts/pdf-import/README.md`.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { AnswerOption, Difficulty, Occupation, PrismaClient, Subject } from "@prisma/client";
import {
  OFFICIAL_SOURCE_DOCUMENTS,
  OFFICIAL_SOURCE_LINKS,
} from "./data/official-source-links";

const prisma = new PrismaClient();

const PUBLIC_DIR = path.join(process.cwd(), "public", "study-material");
const BANK_FILE = path.join(process.cwd(), "prisma", "data", "question-bank.json");

type BankDocument = {
  slug: string;
  title: string;
  titleHi: string;
  file: string;
  occupations: Occupation[];
  year: string;
  subject: Subject;
  minedForQuestions: boolean;
  pageCount?: number;
};

type BankSource = { doc: string; page: number; label: string; week: string | null };

type BankQuestion = {
  slug: string;
  occupations: Occupation[];
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  question: string;
  questionHi: string | null;
  options: { en: string; hi: string | null }[];
  answerIndex: number;
  /** Every bank the question appears in, most trade-specific first. */
  sources: BankSource[];
};

const LETTERS = [AnswerOption.A, AnswerOption.B, AnswerOption.C, AnswerOption.D];

function describe(document: BankDocument, questionCount: number): string {
  const scope = document.minedForQuestions
    ? `${questionCount} question${questionCount === 1 ? "" : "s"} in the portal's test bank are drawn from this document.`
    : "Reference reading. Questions from this document are not yet in the test bank.";
  return `Official NIMI / DGT question bank, ${document.year}. ${scope}`;
}

async function main() {
  const raw = await readFile(BANK_FILE, "utf8");
  const bank = JSON.parse(raw) as { documents: BankDocument[]; questions: BankQuestion[] };

  const documents: BankDocument[] = [
    ...bank.documents,
    ...OFFICIAL_SOURCE_DOCUMENTS.map((document) => ({
      ...document,
      occupations: [...document.occupations] as Occupation[],
      subject: document.subject as Subject,
    })),
  ];

  console.log(`→ Importing ${documents.length} documents and ${bank.questions.length} parsed questions…`);

  // -------------------------------------------------------------------------
  // Study material
  // -------------------------------------------------------------------------
  // `Pdf` is scoped to a single occupation, so a document shared between trades
  // (Employability Skills, Workshop Calculation) becomes one row per trade.
  // `pdfIds` maps "<document slug>::<occupation>" onto the row id.
  const pdfIds = new Map<string, string>();

  for (const document of documents) {
    const file = `${document.slug}.pdf`;
    const absolute = path.join(PUBLIC_DIR, file);

    let fileSize = 0;
    try {
      fileSize = (await stat(absolute)).size;
    } catch {
      console.warn(`  ! ${file} is missing from public/study-material, skipped`);
      continue;
    }

    const questionCount =
      bank.questions.filter((q) => q.sources.some((source) => source.doc === document.slug)).length +
      OFFICIAL_SOURCE_LINKS.filter((link) => link.documentSlug === document.slug).length;

    for (const occupation of document.occupations) {
      const row = await prisma.pdf.upsert({
        where: { slug_occupation: { slug: document.slug, occupation } },
        update: {
          title: document.title,
          titleHi: document.titleHi,
          description: describe(document, questionCount),
          topic: document.year,
          fileUrl: `/study-material/${file}`,
          storagePath: `builtin/${file}`,
          fileSize,
          subject: document.subject,
          year: document.year,
          pageCount: document.pageCount,
          builtIn: true,
        },
        create: {
          slug: document.slug,
          title: document.title,
          titleHi: document.titleHi,
          description: describe(document, questionCount),
          occupation,
          topic: document.year,
          fileUrl: `/study-material/${file}`,
          storagePath: `builtin/${file}`,
          fileSize,
          subject: document.subject,
          year: document.year,
          pageCount: document.pageCount,
          builtIn: true,
        },
        select: { id: true },
      });
      pdfIds.set(`${document.slug}::${occupation}`, row.id);
    }
  }
  console.log(`  ✓ ${pdfIds.size} study-material rows ready`);

  // -------------------------------------------------------------------------
  // Questions
  // -------------------------------------------------------------------------
  let written = 0;
  for (const item of bank.questions) {
    const [a, b, c, d] = item.options;
    const answer = LETTERS[item.answerIndex];
    if (!answer || !a || !b || !c || !d) continue;

    for (const occupation of item.occupations) {
      // Point each trade at a document that trade can actually open. An
      // Employability question printed in the Electrician paper is offered to
      // every trade, but only an Electrician can open that paper — the others
      // are sent to the shared Employability bank instead.
      const source =
        item.sources.find((candidate) => pdfIds.has(`${candidate.doc}::${occupation}`)) ?? null;
      const sourcePdfId = source ? (pdfIds.get(`${source.doc}::${occupation}`) ?? null) : null;

      const data = {
        occupation,
        subject: item.subject,
        topic: item.topic,
        question: item.question,
        optionA: a.en,
        optionB: b.en,
        optionC: c.en,
        optionD: d.en,
        correctAnswer: answer,
        difficulty: item.difficulty,
        questionHi: item.questionHi,
        optionAHi: a.hi,
        optionBHi: b.hi,
        optionCHi: c.hi,
        optionDHi: d.hi,
        sourcePdfId,
        sourcePage: source?.page ?? null,
        sourceLabel: source?.label ?? null,
        syllabusWeek: source?.week ?? null,
        active: true,
      };

      await prisma.question.upsert({
        where: { occupation_importKey: { occupation, importKey: item.slug } },
        update: data,
        create: { ...data, importKey: item.slug },
      });
      written += 1;
    }
  }

  console.log(`  ✓ ${written} question rows written`);

  // The two official Bharat Skills theory books are image-based. Link the
  // curated starter questions to their exact lesson pages without claiming
  // that OCR extracted those questions verbatim from the scans.
  let linked = 0;
  for (const link of OFFICIAL_SOURCE_LINKS) {
    const sourcePdfId = pdfIds.get(`${link.documentSlug}::${link.occupation}`);
    if (!sourcePdfId) continue;

    const result = await prisma.question.updateMany({
      where: { occupation: link.occupation, question: link.question },
      data: {
        sourcePdfId,
        sourcePage: link.page,
        sourceLabel: link.label,
      },
    });
    linked += result.count;
    if (result.count === 0) console.warn(`  ! Starter question not found: ${link.question}`);
  }
  console.log(`  ✓ ${linked} Solar/Cosmetology questions linked to official theory pages`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  for (const occupation of Object.values(Occupation)) {
    const bySubject = await prisma.question.groupBy({
      by: ["subject"],
      where: { occupation, active: true },
      _count: true,
    });
    const total = bySubject.reduce((sum, row) => sum + row._count, 0);
    const detail = bySubject.map((row) => `${row.subject.toLowerCase()} ${row._count}`).join(", ");
    console.log(`  • ${occupation}: ${total} question(s): ${detail || "none"}`);
  }

  console.log("→ Import complete.");
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
