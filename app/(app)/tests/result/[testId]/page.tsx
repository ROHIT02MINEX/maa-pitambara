import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  MinusCircle,
  Target,
  XCircle,
} from "lucide-react";

import { currentUser } from "@/lib/auth";
import { getSuggestedPdfs, getTestResult } from "@/lib/queries/learner";
import { PASS_PERCENTAGE } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Test result" };

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
  const suggestions = await getSuggestedPdfs(result.occupation, result.weakTopics);

  return (
    <div className="space-y-6">
      <section
        className={cn(
          "glass rounded-xl p-6 sm:p-8",
          passed ? "ring-1 ring-success/30" : "ring-1 ring-destructive/30",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-2xl",
                passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
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
                {passed ? "You passed!" : "Not this time"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {passed
                  ? `You scored ${result.percentage}% — comfortably above the ${PASS_PERCENTAGE}% pass mark.`
                  : `You scored ${result.percentage}%. You need ${PASS_PERCENTAGE}% to pass — review the topics below and try again.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {result.submittedAt ? formatDate(result.submittedAt, true) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/learn">
                <BookOpen className="h-4 w-4" /> Study material
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tests">
                Take another test <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Score {result.score} / {result.totalQuestions}
            </span>
            <span className="text-muted-foreground">
              Pass mark {PASS_PERCENTAGE}%
            </span>
          </div>
          <Progress
            value={result.percentage}
            indicatorClassName={passed ? "bg-success" : "bg-destructive"}
            aria-label={`Score ${result.percentage} percent`}
          />
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

      {result.weakTopics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" aria-hidden /> Recommended reading
            </CardTitle>
            <CardDescription>
              You lost marks on: {result.weakTopics.slice(0, 5).join(", ")}. These documents cover
              those areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No material has been published for those topics yet.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((pdf) => (
                  <li key={pdf.id}>
                    <Link
                      href={`/learn?highlight=${pdf.id}`}
                      className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{pdf.title}</span>
                        {pdf.topic ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {pdf.topic}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Answer review</CardTitle>
          <CardDescription>
            Every question with your answer, the correct answer and an explanation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {result.breakdown.map((item, index) => {
              const wasAnswered = item.selected !== null;
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
                    <p className="font-medium">
                      <span className="mr-2 text-muted-foreground">Q{index + 1}.</span>
                      {item.question}
                    </p>
                    <Badge
                      variant={item.correct ? "success" : wasAnswered ? "destructive" : "warning"}
                    >
                      {item.correct ? "Correct" : wasAnswered ? "Wrong" : "Not answered"}
                    </Badge>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {item.options.map((option) => {
                      const isCorrect = option.value === item.correctAnswer;
                      const isChosen = option.value === item.selected;
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
                            <span className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          <span>{option.label}</span>
                          {isChosen ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              your answer
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{item.topic}</Badge>
                    <Badge variant="outline">{item.difficulty.toLowerCase()}</Badge>
                  </div>

                  {item.explanation ? (
                    <p className="mt-3 rounded-lg bg-background/60 p-3 text-sm">
                      <strong className="font-semibold">Why: </strong>
                      {item.explanation}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
