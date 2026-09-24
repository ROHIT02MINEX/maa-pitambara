import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudyNotes } from "@/components/learn/study-notes";
import { T } from "@/components/translated-text";

export const metadata = { title: "Bilingual study notes" };
export default async function StudyPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await currentUser();
  if (!user?.id || !user.occupation) redirect("/onboarding");
  const params = await searchParams;
  const q = (params.q || "").slice(0, 120);
  const requestedPage = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const where = { occupation: user.occupation, active: true, ...(q ? { OR: [
    { question: { contains: q, mode: "insensitive" as const } },
    { questionHi: { contains: q, mode: "insensitive" as const } },
    { topic: { contains: q, mode: "insensitive" as const } },
  ] } : {}) };
  const total = await prisma.question.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(Math.floor(requestedPage), pages);
  const questions = await prisma.question.findMany({ where, skip: (page - 1) * 20, take: 20,
    orderBy: [{ topic: "asc" }, { id: "asc" }],
    select: { id: true, topic: true, question: true, questionHi: true, optionA: true, optionAHi: true,
      optionB: true, optionBHi: true, optionC: true, optionCHi: true, optionD: true, optionDHi: true,
      correctAnswer: true, explanation: true, explanationHi: true, sourcePage: true,
      sourcePdf: { select: { title: true, titleHi: true, fileUrl: true } } },
  });
  return <div className="space-y-6"><header><h1 className="text-2xl font-bold"><T>Bilingual study notes</T></h1>
    <p className="text-muted-foreground"><T>Read questions, correct answers and explanations in English or Hindi. Use the language button to switch.</T></p></header>
    <StudyNotes questions={questions} page={page} pages={pages} query={q} />
  </div>;
}
