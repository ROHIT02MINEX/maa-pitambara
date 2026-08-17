"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnswerOption } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flag,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { saveAnswerAction, submitTestAction } from "@/actions/test";
import { runAction } from "@/lib/run-action";
import { useCountdown } from "@/hooks/use-countdown";
import { useLanguage } from "@/hooks/use-language";
import { cn, formatDuration } from "@/lib/utils";
import { PASS_PERCENTAGE, SUBJECT_LABELS, SUBJECT_LABELS_HI } from "@/lib/constants";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
/** Circumference of the r=26 timer ring, for the stroke-dash countdown. */
const RING_LENGTH = 2 * Math.PI * 26;

export function TestRunner({ test }: { test: ActiveTest }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [answers, setAnswers] = React.useState<Record<string, AnswerOption | null>>(() =>
    Object.fromEntries(test.questions.map((q) => [q.questionId, q.selected])),
  );
  const [flagged, setFlagged] = React.useState<Record<string, boolean>>({});
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
    toast.warning("Time is up. Submitting your answers.");
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
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const total = test.questions.length;
  const unanswered = test.questions.filter((q) => !answers[q.questionId]);

  const choose = React.useCallback(
    async (questionId: string, option: AnswerOption) => {
      if (submittedRef.current) return;

      const previous = answers[questionId] ?? null;
      setAnswers((state) => ({ ...state, [questionId]: option }));
      setSaving(questionId);

      const result = await runAction(() =>
        saveAnswerAction({ testId: test.id, questionId, selectedAnswer: option }),
      );
      setSaving(null);

      if (!result.ok) {
        setAnswers((state) => ({ ...state, [questionId]: previous }));
        toast.error(result.error);
        // The server rejects saves after expiry; refresh to land on the result.
        if (result.error.toLowerCase().includes("time is up")) router.refresh();
      }
    },
    [answers, router, test.id],
  );

  // Keyboard: 1-4 answer, ← → move, F flags. Skipped while a dialog is open or
  // the learner is typing somewhere, so it never fights a real input.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (reviewOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;

      const slot = Number(event.key);
      if (slot >= 1 && slot <= current.options.length) {
        event.preventDefault();
        void choose(current.questionId, current.options[slot - 1]!.value);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(total - 1, i + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFlagged((state) => ({
          ...state,
          [current.questionId]: !state[current.questionId],
        }));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, current, reviewOpen, total]);

  const danger = remaining <= DANGER_SECONDS;
  const answeredRatio = total ? answeredCount / total : 0;
  const timeRatio = Math.max(0, Math.min(1, remaining / test.durationSec));

  const hindi = language === "hi";
  const stem = hindi ? (current.questionHi ?? current.question) : current.question;
  const noHindi = hindi && !current.questionHi;

  return (
    <div className="space-y-5">
      {/* -------------------------------------------------------------- */}
      {/* Timer bar                                                       */}
      {/* -------------------------------------------------------------- */}
      <Card className="sticky top-16 z-20 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  strokeWidth="6"
                  className="stroke-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - timeRatio)}
                  className={cn(
                    "transition-[stroke-dashoffset] duration-1000 ease-linear",
                    danger ? "stroke-destructive" : "stroke-primary",
                  )}
                />
              </svg>
              <span
                className={cn(
                  "absolute inset-0 grid place-items-center font-mono text-sm font-bold tabular-nums",
                  danger && "animate-pulse text-destructive",
                )}
                role="timer"
                aria-live="off"
                aria-label={`Time remaining ${formatDuration(remaining)}`}
              >
                {formatDuration(remaining)}
              </span>
            </div>

            <div className="text-sm">
              <p className="font-semibold">
                Question {index + 1} of {total}
              </p>
              <p className="text-muted-foreground">
                {answeredCount} answered · {total - answeredCount} left
                {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hindi ? SUBJECT_LABELS_HI[current.subject] : SUBJECT_LABELS[current.subject]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle
              value={language}
              onChange={setLanguage}
              unavailable={noHindi}
            />
            <Button onClick={() => setReviewOpen(true)} disabled={submitting}>
              <Send className="h-4 w-4" /> Review &amp; submit
            </Button>
          </div>
        </div>

        {/* Answering progress, drawn as a bar flush with the card's edge. */}
        <div
          className="h-1.5 w-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(answeredRatio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Answering progress"
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-gold transition-[width] duration-300"
            style={{ width: `${answeredRatio * 100}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* ------------------------------------------------------------ */}
        {/* Question                                                      */}
        {/* ------------------------------------------------------------ */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {hindi ? SUBJECT_LABELS_HI[current.subject] : SUBJECT_LABELS[current.subject]}
            </Badge>
            <Badge variant="outline">1 mark</Badge>
            {saving === current.questionId ? (
              <Badge variant="outline">Saving…</Badge>
            ) : answers[current.questionId] ? (
              <Badge variant="success">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            ) : null}

            <Button
              variant={flagged[current.questionId] ? "default" : "outline"}
              size="sm"
              className="ml-auto"
              aria-pressed={Boolean(flagged[current.questionId])}
              onClick={() =>
                setFlagged((state) => ({
                  ...state,
                  [current.questionId]: !state[current.questionId],
                }))
              }
            >
              <Flag className="h-4 w-4" />
              {flagged[current.questionId] ? "Flagged" : "Flag for review"}
            </Button>
          </div>

          <h2
            lang={hindi && current.questionHi ? "hi" : "en"}
            className={cn(
              "text-lg font-semibold leading-relaxed",
              hindi && current.questionHi && "font-devanagari",
            )}
          >
            {stem}
          </h2>

          {/* When Hindi is selected but this question has none, show the
              English text and say so rather than falling back silently. */}
          {noHindi ? (
            <p className="mt-2 text-xs text-muted-foreground">
              इस प्रश्न का हिन्दी अनुवाद उपलब्ध नहीं है, इसलिए अंग्रेज़ी में दिखाया गया है.
            </p>
          ) : null}

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Choose one answer</legend>
            {current.options.map((option, optionIndex) => {
              const selected = answers[current.questionId] === option.value;
              const label = hindi ? (option.labelHi ?? option.label) : option.label;
              const inHindi = hindi && Boolean(option.labelHi);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
                    "focus-within:ring-2 focus-within:ring-ring",
                    selected
                      ? "border-primary bg-primary/[0.07] shadow-sm ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`question-${current.questionId}`}
                    value={option.value}
                    checked={selected}
                    onChange={() => choose(current.questionId, option.value)}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span
                    lang={inHindi ? "hi" : "en"}
                    className={cn("text-sm leading-relaxed", inHindi && "font-devanagari")}
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p className="mt-4 text-xs text-muted-foreground">
            Shortcuts: press <kbd className="rounded border px-1">1</kbd>–
            <kbd className="rounded border px-1">4</kbd> to answer,{" "}
            <kbd className="rounded border px-1">←</kbd>{" "}
            <kbd className="rounded border px-1">→</kbd> to move,{" "}
            <kbd className="rounded border px-1">F</kbd> to flag.
          </p>

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
                <Send className="h-4 w-4" /> Finish
              </Button>
            ) : (
              <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------------ */}
        {/* Palette                                                       */}
        {/* ------------------------------------------------------------ */}
        <Card className="h-fit p-5 lg:sticky lg:top-44">
          <h2 className="text-sm font-semibold">Question palette</h2>
          <p className="mt-1 text-xs text-muted-foreground">Jump to any question at any time.</p>

          <ol className="mt-4 grid grid-cols-5 gap-2">
            {test.questions.map((question, questionIndex) => {
              const answered = Boolean(answers[question.questionId]);
              const isFlagged = Boolean(flagged[question.questionId]);
              const isCurrent = questionIndex === index;
              return (
                <li key={question.questionId} className="relative">
                  <button
                    type="button"
                    onClick={() => setIndex(questionIndex)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${questionIndex + 1}${
                      answered ? ", answered" : ", not answered"
                    }${isFlagged ? ", flagged" : ""}`}
                    className={cn(
                      "grid h-10 w-full place-items-center rounded-lg border text-sm font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      answered
                        ? "border-primary/50 bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {questionIndex + 1}
                  </button>
                  {isFlagged ? (
                    <span
                      className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-gold text-gold-foreground"
                      aria-hidden
                    >
                      <Flag className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <dl className="mt-5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-primary/50 bg-primary" aria-hidden />
              <dt>Answered</dt>
              <dd className="ml-auto font-medium text-foreground">{answeredCount}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3" aria-hidden />
              <dt>Not answered</dt>
              <dd className="ml-auto font-medium text-foreground">{total - answeredCount}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-3 w-3 text-gold" aria-hidden />
              <dt>Flagged</dt>
              <dd className="ml-auto font-medium text-foreground">{flaggedCount}</dd>
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
                      and there is no negative marking, so it is always worth guessing.
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

                {flaggedCount > 0 ? (
                  <p className="flex items-center gap-2 text-xs">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                    {flaggedCount} question{flaggedCount === 1 ? " is" : "s are"} flagged for review.
                  </p>
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
