"use client";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { T } from "@/components/translated-text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type StudyQuestion = { id: string; topic: string; question: string; questionHi: string | null;
  optionA: string; optionB: string; optionC: string | null; optionD: string | null;
  optionAHi: string | null; optionBHi: string | null; optionCHi: string | null; optionDHi: string | null;
  correctAnswer: "A" | "B" | "C" | "D"; explanation: string | null; explanationHi: string | null;
  sourcePage: number | null; sourcePdf: { title: string; titleHi: string | null; fileUrl: string } | null };

export function StudyNotes({ questions, page, pages, query }: { questions: StudyQuestion[]; page: number; pages: number; query: string }) {
  const { language } = useLanguage();
  const hi = language === "hi";
  const href = (next: number) => `/study?${new URLSearchParams({ q: query, page: String(next) })}`;
  return <div className="space-y-5">
    <form action="/study" className="flex gap-2"><Input name="q" defaultValue={query} placeholder="Search study notes in Hindi or English" aria-label="Search study notes" /><Button type="submit"><T>Search</T></Button></form>
    <p className="text-sm text-muted-foreground"><T>Original PDF files retain their published language. These study notes are available in both languages.</T></p>
    {hi && <p className="text-xs text-muted-foreground">कुछ हिन्दी अनुवाद स्वचालित हैं। तकनीकी शब्दों की पुष्टि के लिए मूल अंग्रेज़ी पाठ देखें।</p>}
    {questions.length === 0 && <p><T>No questions found.</T></p>}
    {questions.map(q => {
      const answer = q[`option${q.correctAnswer}`];
      const answerHi = q[`option${q.correctAnswer}Hi`];
      return <Card key={q.id} className="space-y-3 p-5">
        <h2 className="break-words font-semibold" lang={language}>{(hi ? q.questionHi || q.question : q.question).replace(/_{8,}/g, "______")}</h2>
        {hi && <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">मूल अंग्रेज़ी प्रश्न देखें</summary><p lang="en" className="mt-2">{q.question}</p></details>}
        <p className="text-success"><strong><T>Correct answer</T>: </strong>{hi ? answerHi || answer : answer}</p>
        {(q.explanation || q.explanationHi) && <p lang={language}>{hi ? q.explanationHi || q.explanation : q.explanation}</p>}
        {q.sourcePdf && <a className="text-sm text-primary underline" href={`${q.sourcePdf.fileUrl}${q.sourcePage ? `#page=${q.sourcePage}` : ""}`} target="_blank" rel="noopener noreferrer"><T>Read source material</T>: {hi ? q.sourcePdf.titleHi || q.sourcePdf.title : q.sourcePdf.title}</a>}
      </Card>;
    })}
    <nav className="flex items-center justify-between" aria-label="Study pages">
      {page > 1 ? <Button asChild variant="outline"><Link href={href(page - 1)}><T>Previous</T></Link></Button> : <span />}
      <span>{hi ? `पृष्ठ ${page} / ${pages}` : `Page ${page} / ${pages}`}</span>
      {page < pages ? <Button asChild variant="outline"><Link href={href(page + 1)}><T>Next</T></Link></Button> : <span />}
    </nav>
  </div>;
}
