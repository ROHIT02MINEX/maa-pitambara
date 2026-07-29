"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnswerOption } from "@prisma/client";
import { AlertTriangle, ChevronLeft, ChevronRight, Circle, Flag, Send } from "lucide-react";
import { toast } from "sonner";

import { saveAnswerAction, submitTestAction } from "@/actions/test";
import { runAction } from "@/lib/run-action";
import { useCountdown } from "@/hooks/use-countdown";
import { cn, formatDuration } from "@/lib/utils";
import { PASS_PERCENTAGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActiveTest } from "@/types";

/** Last two minutes turn the clock red and start a subtle pulse. */
const DANGER_SECONDS = 120;

export function TestRunner({ test }: { test: ActiveTest }) {
  const router = useRouter();

  const [answers, setAnswers] = React.useState<Record<string, AnswerOption | null>>(() =>
    Object.fromEntries(test.questions.map((q) => [q.questionId, q.selected])),
  );
  const [index, setIndex] = React.useState(0);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const submittedRef = React.useRef(false);

  const submit = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const result = await runAction(() => submitTestAction(test.id, auto));
      if (!result.ok) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Test submitted.");
      router.replace(`/tests/result/${test.id}`);
      router.refresh();
    },
    [router, test.id],
  );

  const remaining = useCountdown(test.expiresAt, () => {
    toast.warning("Time is up — submitting your answers.");
    void submit(true);
  });

  // Warn before an accidental navigation away from a live attempt.
  React.useEffect(() => {
    function handler(event: BeforeUnloadEvent) {
      if (submittedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const current = test.questions[index]!;
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const total = test.questions.length;
  const unanswered = test.questions.filter((q) => !answers[q.questionId]);

  async function choose(option: AnswerOption) {
    if (submittedRef.current) return;

    const previous = answers[current.questionId] ?? null;
    setAnswers((state) => ({ ...state, [current.questionId]: option }));
    setSaving(current.questionId);

    const result = await runAction(() =>
      saveAnswerAction({
        testId: test.id,
        questionId: current.questionId,
        selectedAnswer: option,
      }),
    );
    setSaving(null);

    if (!result.ok) {
      setAnswers((state) => ({ ...state, [current.questionId]: previous }));
      toast.error(result.error);
      // The server rejects saves after expiry; refresh to land on the result.
      if (result.error.toLowerCase().includes("time is up")) router.refresh();
    }
  }

  const danger = remaining <= DANGER_SECONDS;
  const progressValue = total ? (answeredCount / total) * 100 : 0;

  return (
    <div className="space-y-5">
      <Card className="sticky top-16 z-20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-lg px-3 py-2 font-mono text-xl font-bold tabular-nums",
                danger
                  ? "animate-pulse bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
              role="timer"
              aria-live="off"
              aria-label={`Time remaining ${formatDuration(remaining)}`}
            >
              {formatDuration(remaining)}
            </span>
            <div className="text-sm">
              <p className="font-medium">
                Question {index + 1} of {total}
              </p>
              <p className="text-muted-foreground">
                {answeredCount} answered · {total - answeredCount} left
              </p>
            </div>
          </div>

          <Button onClick={() => setReviewOpen(true)} disabled={submitting}>
            <Send className="h-4 w-4" /> Review &amp; submit
          </Button>
        </div>

        <Progress className="mt-3" value={progressValue} aria-label="Answering progress" />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {current.type === "TRUE_FALSE" ? "True / False" : "Multiple choice"}
            </Badge>
            <Badge variant="outline">1 mark</Badge>
            {saving === current.questionId ? (
              <Badge variant="outline">Saving…</Badge>
            ) : answers[current.questionId] ? (
              <Badge variant="success">Answer saved</Badge>
            ) : null}
          </div>

          <h2 className="text-lg font-semibold leading-relaxed">{current.question}</h2>

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Choose one answer</legend>
            {current.options.map((option, optionIndex) => {
              const selected = answers[current.questionId] === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
                    "focus-within:ring-2 focus-within:ring-ring",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`question-${current.questionId}`}
                    value={option.value}
                    checked={selected}
                    onChange={() => choose(option.value)}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="text-sm leading-relaxed">{option.label}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            {index === total - 1 ? (
              <Button onClick={() => setReviewOpen(true)}>
                <Flag className="h-4 w-4" /> Finish
              </Button>
            ) : (
              <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        <Card className="h-fit p-5 lg:sticky lg:top-44">
          <h2 className="text-sm font-semibold">Question palette</h2>
          <p className="mt-1 text-xs text-muted-foreground">Jump to any question at any time.</p>

          <ol className="mt-4 grid grid-cols-5 gap-2">
            {test.questions.map((question, questionIndex) => {
              const answered = Boolean(answers[question.questionId]);
              const isCurrent = questionIndex === index;
              return (
                <li key={question.questionId}>
                  <button
                    type="button"
                    onClick={() => setIndex(questionIndex)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${questionIndex + 1}${answered ? ", answered" : ", not answered"}`}
                    className={cn(
                      "grid h-9 w-full place-items-center rounded-lg border text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      answered
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {questionIndex + 1}
                  </button>
                </li>
              );
            })}
          </ol>

          <dl className="mt-5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-primary/40 bg-primary/10" aria-hidden />
              <dt>Answered</dt>
              <dd className="ml-auto font-medium text-foreground">{answeredCount}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3" aria-hidden />
              <dt>Not answered</dt>
              <dd className="ml-auto font-medium text-foreground">{total - answeredCount}</dd>
            </div>
          </dl>

          <Button className="mt-5 w-full" onClick={() => setReviewOpen(true)} disabled={submitting}>
            Submit test
          </Button>
        </Card>
      </div>

      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You have answered <strong>{answeredCount}</strong> of {total} questions.
                  {unanswered.length > 0 ? (
                    <>
                      {" "}
                      <span className="text-destructive">
                        {unanswered.length} question{unanswered.length === 1 ? " is" : "s are"} still
                        blank
                      </span>{" "}
                      — there is no negative marking, so it is always worth guessing.
                    </>
                  ) : (
                    " Everything is answered."
                  )}
                </p>
                {unanswered.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unanswered.slice(0, 20).map((question) => (
                      <button
                        key={question.questionId}
                        type="button"
                        onClick={() => {
                          setIndex(question.index);
                          setReviewOpen(false);
                        }}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        Q{question.index + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Once submitted your answers are final and cannot be changed. You need{" "}
                  {PASS_PERCENTAGE}% to pass.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submit(false);
              }}
            >
              {submitting ? "Submitting…" : "Submit now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
