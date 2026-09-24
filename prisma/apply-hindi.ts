import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";

// Add translations without replacing institute-authored Hindi or changing answers.
const prisma = new PrismaClient();
const dictionary: Record<string, string> = JSON.parse(readFileSync(new URL("./data/hindi-translations.json", import.meta.url), "utf8"));
const fields = ["question", "optionA", "optionB", "optionC", "optionD", "explanation"] as const;
async function main() {
  const questions = await prisma.question.findMany();
  let updated = 0;
  for (let start = 0; start < questions.length; start += 100) {
    const changes = questions.slice(start, start + 100).flatMap(q => {
      const data: Record<string, string> = { id: q.id };
      for (const field of fields) {
        const target = `${field}Hi` as const;
        if (!q[target]?.trim() && q[field] && dictionary[q[field]!]) data[target] = dictionary[q[field]!];
      }
      return Object.keys(data).length > 1 ? [data] : [];
    });
    if (changes.length) {
      const columns = fields.map(field => `${field}Hi`);
      await prisma.$executeRaw(Prisma.sql`
        UPDATE questions AS q SET ${Prisma.join(columns.map(column => Prisma.sql`${Prisma.raw(`"${column}"`)} = COALESCE(NULLIF(q.${Prisma.raw(`"${column}"`)}, ''), t.${Prisma.raw(`"${column}"`)})`))}
        FROM jsonb_to_recordset(${JSON.stringify(changes)}::jsonb) AS t(id text, "questionHi" text, "optionAHi" text, "optionBHi" text, "optionCHi" text, "optionDHi" text, "explanationHi" text)
        WHERE q.id = t.id
      `);
    }
    updated += changes.length;
  }
  console.log(`Filled missing Hindi fields in ${updated} questions; existing Hindi and answer keys preserved.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
