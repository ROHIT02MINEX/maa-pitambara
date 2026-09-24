"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ExternalLink, MinusCircle, XCircle } from "lucide-react";

import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS, SUBJECT_LABELS, SUBJECT_LABELS_HI } from "@/lib/constants";
import { LanguageToggle } from "@/components/language-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TestResultView } from "@/types";

type Item = TestResultView["breakdown"][number];
type Filter = "all" | "wrong";

/**
 * Deep link into the source PDF at the page the question was printed on.
 * `#page=` is the PDF Open Parameters fragment, honoured by the built-in
 * viewers in Chrome, Edge, Firefox and Safari. A viewer that ignores it simply
 * opens the document at page one, so the link degrades rather than breaking.
 */
function sourceHref(fileUrl: string, page: number | null) {
  return page ? `${fileUrl}#page=${page}` : fileUrl;
}

/** What to read after getting a question wrong. */
function StudyReference({ item }: { item: Item }) {
  const { source } = item;
  if (!source.fileUrl || !source.title) {
    return (
      <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"><T>{" Revise "}</T><strong className="font-medium text-foreground"><T>{item.topic}</T></strong><T>{" from the study material for your trade. "}</T></p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gold/40 bg-gold/[0.07] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 shrink-0 text-gold" aria-hidden /><T>{" Where to learn this "}</T></p>

      <p className="mt-2 text-sm">
        <span className="font-medium"><T>{source.title}</T></span>
        {source.page ? (
          <>
            <T>{", "}</T>
            <span className="whitespace-nowrap"><T>{"page "}</T><T>{source.page}</T></span>
          </>
        ) : null}
      </p>

      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span><T>{"Topic: "}</T><T>{item.topic}</T></span>
        {source.label ? <span><T>{source.label}</T></span> : null}
        {source.syllabusWeek ? <span><T>{"Syllabus week "}</T><T>{source.syllabusWeek}</T></span> : null}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={sourceHref(source.fileUrl, source.page)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            <T>{source.page ? `Open page ${source.page}` : "Open document"}</T>
          </a>
        </Button>
        {source.pdfId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/learn?highlight=${source.pdfId}`}><T>{"Find in library"}</T></Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AnswerReview({ breakdown }: { breakdown: TestResultView["breakdown"] }) {
  const { language, setLanguage } = useLanguage();
  const [filter, setFilter] = React.useState<Filter>("all");

  const hindi = language === "hi";
  const wrongCount = breakdown.filter((item) => !item.correct).length;
  const items = filter === "wrong" ? breakdown.filter((item) => !item.correct) : breakdown;

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle><T>{"Answer review"}</T></CardTitle>
          <CardDescription><T>{" Every question with your answer, the correct answer, and, where you went wrong, the document and page that explains it. "}</T></CardDescription>
        </div>
        <LanguageToggle value={language} onChange={setLanguage} className="shrink-0" />
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all"><T>{"All "}</T><T>{breakdown.length}</T></TabsTrigger>
            <TabsTrigger value="wrong"><T>{"To revise "}</T><T>{wrongCount}</T></TabsTrigger>
          </TabsList>
        </Tabs>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"><T>{" Nothing to revise. Every answer was correct. "}</T></p>
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const number = breakdown.indexOf(item) + 1;
              const wasAnswered = item.selected !== null;
              const stemInHindi = hindi && Boolean(item.questionHi);

              return (
                <li
                  key={item.questionId}
                  className={cn(
                    "rounded-xl border p-5",
                    item.correct
                      ? "border-success/30 bg-success/5"
                      : wasAnswered
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-warning/40 bg-warning/5",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p
                      lang={stemInHindi ? "hi" : "en"}
                      className={cn("font-medium", stemInHindi && "font-devanagari")}
                    >
                      <span className="mr-2 text-muted-foreground"><T>{"Q"}</T><T>{number}</T><T>{"."}</T></span>
                      <T>{stemInHindi ? item.questionHi : item.question}</T>
                    </p>
                    <Badge
                      variant={item.correct ? "success" : wasAnswered ? "destructive" : "warning"}
                    >
                      <T>{item.correct ? "Correct" : wasAnswered ? "Wrong" : "Not answered"}</T>
                    </Badge>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {item.options.map((option) => {
                      const isCorrect = option.value === item.correctAnswer;
                      const isChosen = option.value === item.selected;
                      const optionInHindi = hindi && Boolean(option.labelHi);
                      return (
                        <li
                          key={option.value}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            isCorrect && "border-success bg-success/10 font-medium",
                            isChosen && !isCorrect && "border-destructive bg-destructive/10",
                          )}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                          ) : isChosen ? (
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                          ) : (
                            <MinusCircle className="h-4 w-4 shrink-0 opacity-0" aria-hidden />
                          )}
                          <span
                            lang={optionInHindi ? "hi" : "en"}
                            className={cn(optionInHindi && "font-devanagari")}
                          >
                            <T>{optionInHindi ? option.labelHi : option.label}</T>
                          </span>
                          {isChosen ? (
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground"><T>{" your answer "}</T></span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      <T>{hindi ? SUBJECT_LABELS_HI[item.subject] : SUBJECT_LABELS[item.subject]}</T>
                    </Badge>
                    <Badge variant="outline"><T>{item.topic}</T></Badge>
                    <Badge variant="outline"><T>{DIFFICULTY_LABELS[item.difficulty]}</T></Badge>
                  </div>

                  {item.explanation ? (
                    <p className="mt-3 rounded-lg bg-background/70 p-3 text-sm">
                      <strong className="font-semibold"><T>{"Why: "}</T></strong>
                      <T>{hindi && item.explanationHi ? item.explanationHi : item.explanation}</T>
                    </p>
                  ) : null}

                  {/* The point of the whole page: a wrong answer names its source. */}
                  {item.correct ? null : <StudyReference item={item} />}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
