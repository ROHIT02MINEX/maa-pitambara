import { stat } from "node:fs/promises";
import path from "node:path";
import { Occupation, PrismaClient, Subject } from "@prisma/client";

import { OFFICIAL_SOURCE_DOCUMENTS, OFFICIAL_SOURCE_LINKS } from "./data/official-source-links";

const prisma = new PrismaClient();

async function main() {
  const pdfIds = new Map<string, string>();
  for (const document of OFFICIAL_SOURCE_DOCUMENTS) {
    const file = `${document.slug}.pdf`;
    const fileSize = (await stat(path.join(process.cwd(), "public", "study-material", file))).size;
    const questionCount = OFFICIAL_SOURCE_LINKS.filter(
      (link) => link.documentSlug === document.slug,
    ).length;

    for (const occupationName of document.occupations) {
      const occupation = occupationName as Occupation;
      const row = await prisma.pdf.upsert({
        where: { slug_occupation: { slug: document.slug, occupation } },
        update: {
          title: document.title,
          titleHi: document.titleHi,
          description: `Official Bharat Skills / NIMI trade theory, ${document.year}. ${questionCount} curated test questions link to exact revision pages in this book.`,
          topic: document.year,
          fileUrl: `/study-material/${file}`,
          storagePath: `builtin/${file}`,
          fileSize,
          subject: document.subject as Subject,
          year: document.year,
          pageCount: document.pageCount,
          builtIn: true,
        },
        create: {
          slug: document.slug,
          title: document.title,
          titleHi: document.titleHi,
          description: `Official Bharat Skills / NIMI trade theory, ${document.year}. ${questionCount} curated test questions link to exact revision pages in this book.`,
          occupation,
          topic: document.year,
          fileUrl: `/study-material/${file}`,
          storagePath: `builtin/${file}`,
          fileSize,
          subject: document.subject as Subject,
          year: document.year,
          pageCount: document.pageCount,
          builtIn: true,
        },
        select: { id: true },
      });
      pdfIds.set(`${document.slug}::${occupation}`, row.id);
    }
  }

  let linked = 0;
  for (const link of OFFICIAL_SOURCE_LINKS) {
    const sourcePdfId = pdfIds.get(`${link.documentSlug}::${link.occupation}`);
    if (!sourcePdfId) continue;
    const result = await prisma.question.updateMany({
      where: { occupation: link.occupation, question: link.question },
      data: { sourcePdfId, sourcePage: link.page, sourceLabel: link.label },
    });
    linked += result.count;
  }
  console.log(`Official source sync complete: ${pdfIds.size} books, ${linked} question links.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
