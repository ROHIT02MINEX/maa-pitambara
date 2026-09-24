
import { T } from "@/components/translated-text";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MinusCircle,
  Target,
  XCircle,
} from "lucide-react";

import { currentUser } from "@/lib/auth";
import { getTestResult } from "@/lib/queries/learner";
import { PASS_PERCENTAGE, SUBJECT_LABELS } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnswerReview } from "@/components/tests/answer-review";
import { InstituteLogo } from "@/components/brand/institute-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Test result" };

/** "3, 7, 8, 12" — the pages to revise, capped so the line stays readable. */
function pageList(pages: number[]) {
  if (pages.length === 0) return null;
  const shown = pages.slice(0, 8).join(", ");
  return pages.length > 8 ? `${shown} +${pages.length - 8} more` : shown;
}

export default async function TestResultPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const user = await currentUser();
  if (!user?.id) redirect("/login");

  const result = await getTestResult(testId, user.id);
  if (!result) notFound();

  const passed = result.status === "PASSED";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Headline                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="overflow-hidden rounded-xl border">
        <div className="crest-band p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "grid h-16 w-16 shrink-0 place-items-center rounded-2xl",
                  passed ? "bg-white/15 text-white" : "bg-black/25 text-white",
                )}
              >
                {passed ? (
                  <CheckCircle2 className="h-8 w-8" aria-hidden />
                ) : (
                  <XCircle className="h-8 w-8" aria-hidden />
                )}
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <T>{passed ? "You passed!" : "Not this time"}</T>
                </h1>
                <p className="mt-1 max-w-xl text-primary-foreground/85">
                  <T>{passed
                    ? `You scored ${result.percentage}%, above the ${PASS_PERCENTAGE}% pass mark.`
                    : `You scored ${result.percentage}%. You need ${PASS_PERCENTAGE}% to pass. The study plan below is built from the questions you missed.`}</T>
                </p>
                <p className="mt-2 text-xs text-primary-foreground/70"><T>{" Submitted "}</T><T>{result.submittedAt ? formatDate(result.submittedAt, true) : "-"}</T>
                </p>
              </div>
            </div>

            <InstituteLogo
                size={64}
                className="hidden h-16 w-16 shrink-0 rounded-full bg-white/95 p-1 sm:block"
                title={null}
              />
          </div>

          <div className="mt-7 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium"><T>{" Score "}</T><T>{result.score}</T><T>{" / "}</T><T>{result.totalQuestions}</T>
              </span>
              <span className="text-primary-foreground/75"><T>{"Pass mark "}</T><T>{PASS_PERCENTAGE}</T><T>{"%"}</T></span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-valuenow={Math.round(result.percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Score ${result.percentage} percent`}
            >
              <div
                className={cn("h-full rounded-full", passed ? "bg-leaf" : "bg-saffron")}
                style={{ width: `${Math.min(100, result.percentage)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t bg-card p-4">
          <Button asChild variant="outline">
            <Link href="/learn">
              <BookOpen className="h-4 w-4" /><T>{" Study material "}</T></Link>
          </Button>
          <Button asChild>
            <Link href="/tests"><T>{" Take another test "}</T><ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Correct" value={result.correctCount} icon={CheckCircle2} tone="success" />
        <StatCard label="Wrong" value={result.wrongCount} icon={XCircle} tone="destructive" />
        <StatCard
          label="Unanswered"
          value={result.unansweredCount}
          icon={MinusCircle}
          tone="warning"
        />
        <StatCard
          label="Time taken"
          value={formatDuration(result.timeTaken)}
          hint="Out of 30:00"
          icon={Clock}
          tone="primary"
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Score by subject                                                    */}
      {/* ------------------------------------------------------------------ */}
      {result.subjectBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle><T>{"Score by subject"}</T></CardTitle>
            <CardDescription><T>{" How you did across the four papers of the trade test. "}</T></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2">
              {result.subjectBreakdown.map((row) => {
                const percent = row.total ? Math.round((row.correct / row.total) * 100) : 0;
                return (
                  <li key={row.subject} className="rounded-lg border p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium"><T>{SUBJECT_LABELS[row.subject]}</T></p>
                      <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        <T>{row.correct}</T><T>{"/"}</T><T>{row.total}</T>
                      </p>
                    </div>
                    <Progress
                      className="mt-3"
                      value={percent}
                      indicatorClassName={percent >= PASS_PERCENTAGE ? "bg-success" : "bg-saffron"}
                      aria-label={`${SUBJECT_LABELS[row.subject]}: ${percent} percent`}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Study plan                                                          */}
      {/* ------------------------------------------------------------------ */}
      {result.studyPlan.length > 0 ? (
        <Card className="border-gold/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-gold" aria-hidden /><T>{" Your study plan "}</T></CardTitle>
            <CardDescription><T>{" Built from the "}</T><T>{result.wrongCount + result.unansweredCount}</T><T>{" question "}</T><T>{result.wrongCount + result.unansweredCount === 1 ? "" : "s"}</T><T>{" you missed. Each one points back to the document and pages it came from. "}</T></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 lg:grid-cols-2">
              {result.studyPlan.map((entry) => {
                const pages = pageList(entry.pages);
                return (
                  <li
                    key={entry.pdfId ?? entry.title}
                    className="flex flex-col rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                        <FileText className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug"><T>{entry.title}</T></p>
                        {entry.titleHi ? (
                          <p lang="hi" className="font-devanagari text-xs text-muted-foreground">
                            <T>{entry.titleHi}</T>
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <T>{entry.missed}</T><T>{" missed "}</T></Badge>
                    </div>

                    {pages ? (
                      <p className="mt-3 text-sm">
                        <span className="text-muted-foreground"><T>{"Read page"}</T><T>{entry.pages.length === 1 ? "" : "s"}</T><T>{": "}</T></span>
                        <span className="font-medium tabular-nums"><T>{pages}</T></span>
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.topics.slice(0, 4).map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          <T>{topic}</T>
                        </Badge>
                      ))}
                      {entry.topics.length > 4 ? (
                        <Badge variant="outline" className="text-xs"><T>{" +"}</T><T>{entry.topics.length - 4}</T>
                        </Badge>
                      ) : null}
                    </div>

                    {entry.fileUrl ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <a
                            href={
                              entry.pages[0]
                                ? `${entry.fileUrl}#page=${entry.pages[0]}`
                                : entry.fileUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <T>{entry.pages[0] ? `Start at page ${entry.pages[0]}` : "Open document"}</T>
                          </a>
                        </Button>
                        {entry.pdfId ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/learn?highlight=${entry.pdfId}`}><T>{"Find in library"}</T></Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <AnswerReview breakdown={result.breakdown} />
    </div>
  );
}
