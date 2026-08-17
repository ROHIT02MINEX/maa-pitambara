-- Bilingual question bank + PDF provenance.
--
-- Adds the Hindi columns of the AITT papers, the AITT subject split used to
-- assemble a test to the real paper's blueprint, and the source document /
-- page reference that lets a wrong answer point at the material to revise.

-- CreateEnum
CREATE TYPE "Subject" AS ENUM (
    'TRADE_THEORY',
    'WORKSHOP_CALCULATION',
    'ENGINEERING_DRAWING',
    'EMPLOYABILITY_SKILLS'
);

-- AlterTable: pdfs
ALTER TABLE "pdfs" ADD COLUMN     "titleHi" TEXT,
                   ADD COLUMN     "pageCount" INTEGER,
                   ADD COLUMN     "slug" TEXT,
                   ADD COLUMN     "builtIn" BOOLEAN NOT NULL DEFAULT false,
                   ADD COLUMN     "subject" "Subject",
                   ADD COLUMN     "year" TEXT;

-- AlterTable: questions
ALTER TABLE "questions" ADD COLUMN     "subject" "Subject" NOT NULL DEFAULT 'TRADE_THEORY',
                        ADD COLUMN     "questionHi" TEXT,
                        ADD COLUMN     "optionAHi" TEXT,
                        ADD COLUMN     "optionBHi" TEXT,
                        ADD COLUMN     "optionCHi" TEXT,
                        ADD COLUMN     "optionDHi" TEXT,
                        ADD COLUMN     "explanationHi" TEXT,
                        ADD COLUMN     "sourcePdfId" TEXT,
                        ADD COLUMN     "sourcePage" INTEGER,
                        ADD COLUMN     "sourceLabel" TEXT,
                        ADD COLUMN     "syllabusWeek" TEXT,
                        ADD COLUMN     "importKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pdfs_slug_occupation_key" ON "pdfs"("slug", "occupation");

-- CreateIndex
CREATE UNIQUE INDEX "questions_occupation_importKey_key" ON "questions"("occupation", "importKey");

-- CreateIndex
CREATE INDEX "questions_occupation_subject_active_idx" ON "questions"("occupation", "subject", "active");

-- CreateIndex
CREATE INDEX "questions_sourcePdfId_idx" ON "questions"("sourcePdfId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_sourcePdfId_fkey"
    FOREIGN KEY ("sourcePdfId") REFERENCES "pdfs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
