"use client";
import { T } from "@/components/translated-text";


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
import { toast } from "@/lib/toast";

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
                <T>{formatDuration(remaining)}</T>
              </span>
            </div>

            <div className="text-sm">
              <p className="font-semibold"><T>{" Question "}</T><T>{index + 1}</T><T>{" of "}</T><T>{total}</T>
              </p>
              <p className="text-muted-foreground">
                <T>{answeredCount}</T><T>{" answered · "}</T><T>{total - answeredCount}</T><T>{" left "}</T><T>{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ""}</T>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <T>{hindi ? SUBJECT_LABELS_HI[current.subject] : SUBJECT_LABELS[current.subject]}</T>
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
              <Send className="h-4 w-4" /><T>{" Review & submit "}</T></Button>
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
              <T>{hindi ? SUBJECT_LABELS_HI[current.subject] : SUBJECT_LABELS[current.subject]}</T>
            </Badge>
            <Badge variant="outline"><T>{"1 mark"}</T></Badge>
            {saving === current.questionId ? (
              <Badge variant="outline"><T>{"Saving…"}</T></Badge>
            ) : answers[current.questionId] ? (
              <Badge variant="success">
                <Check className="h-3 w-3" /><T>{" Saved "}</T></Badge>
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
              <T>{flagged[current.questionId] ? "Flagged" : "Flag for review"}</T>
            </Button>
          </div>

          <h2
            lang={hindi && current.questionHi ? "hi" : "en"}
            className={cn(
              "text-lg font-semibold leading-relaxed",
              hindi && current.questionHi && "font-devanagari",
            )}
          >
            <T>{stem}</T>
          </h2>

          {/* When Hindi is selected but this question has none, show the
              English text and say so rather than falling back silently. */}
          {noHindi ? (
            <p className="mt-2 text-xs text-muted-foreground"><T>{" इस प्रश्न का हिन्दी अनुवाद उपलब्ध नहीं है, इसलिए अंग्रेज़ी में दिखाया गया है. "}</T></p>
          ) : null}

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only"><T>{"Choose one answer"}</T></legend>
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
                    <T>{String.fromCharCode(65 + optionIndex)}</T>
                  </span>
                  <span
                    lang={inHindi ? "hi" : "en"}
                    className={cn("text-sm leading-relaxed", inHindi && "font-devanagari")}
                  >
                    <T>{label}</T>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p className="mt-4 text-xs text-muted-foreground"><T>{" Shortcuts: press "}</T><kbd className="rounded border px-1"><T>{"1"}</T></kbd><T>{"– "}</T><kbd className="rounded border px-1"><T>{"4"}</T></kbd><T>{" to answer,"}</T><T>{" "}</T>
            <kbd className="rounded border px-1"><T>{"←"}</T></kbd><T>{" "}</T>
            <kbd className="rounded border px-1"><T>{"→"}</T></kbd><T>{" to move,"}</T><T>{" "}</T>
            <kbd className="rounded border px-1"><T>{"F"}</T></kbd><T>{" to flag. "}</T></p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ChevronLeft className="h-4 w-4" /><T>{" Previous "}</T></Button>

            {index === total - 1 ? (
              <Button onClick={() => setReviewOpen(true)}>
                <Send className="h-4 w-4" /><T>{" Finish "}</T></Button>
            ) : (
              <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}><T>{" Next "}</T><ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------------ */}
        {/* Palette                                                       */}
        {/* ------------------------------------------------------------ */}
        <Card className="h-fit p-5 lg:sticky lg:top-44">
          <h2 className="text-sm font-semibold"><T>{"Question palette"}</T></h2>
          <p className="mt-1 text-xs text-muted-foreground"><T>{"Jump to any question at any time."}</T></p>

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
                    <T>{questionIndex + 1}</T>
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
              <dt><T>{"Answered"}</T></dt>
              <dd className="ml-auto font-medium text-foreground"><T>{answeredCount}</T></dd>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3" aria-hidden />
              <dt><T>{"Not answered"}</T></dt>
              <dd className="ml-auto font-medium text-foreground"><T>{total - answeredCount}</T></dd>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-3 w-3 text-gold" aria-hidden />
              <dt><T>{"Flagged"}</T></dt>
              <dd className="ml-auto font-medium text-foreground"><T>{flaggedCount}</T></dd>
            </div>
          </dl>

          <Button className="mt-5 w-full" onClick={() => setReviewOpen(true)} disabled={submitting}><T>{" Submit test "}</T></Button>
        </Card>
      </div>

      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><T>{"Submit your test?"}</T></AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p><T>{" You have answered "}</T><strong><T>{answeredCount}</T></strong><T>{" of "}</T><T>{total}</T><T>{" questions. "}</T>{unanswered.length > 0 ? (
                    <>
                      <T>{" "}</T>
                      <span className="text-destructive">
                        <T>{unanswered.length}</T><T>{" question"}</T><T>{unanswered.length === 1 ? " is" : "s are"}</T><T>{" still blank "}</T></span><T>{" "}</T><T>{" and there is no negative marking, so it is always worth guessing. "}</T></>
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
                      ><T>{" Q"}</T><T>{question.index + 1}</T>
                      </button>
                    ))}
                  </div>
                ) : null}

                {flaggedCount > 0 ? (
                  <p className="flex items-center gap-2 text-xs">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                    <T>{flaggedCount}</T><T>{" question"}</T><T>{flaggedCount === 1 ? " is" : "s are"}</T><T>{" flagged for review. "}</T></p>
                ) : null}

                <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><T>{" Once submitted your answers are final and cannot be changed. You need"}</T><T>{" "}</T>
                  <T>{PASS_PERCENTAGE}</T><T>{"% to pass. "}</T></p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><T>{"Keep working"}</T></AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submit(false);
              }}
            >
              <T>{submitting ? "Submitting…" : "Submit now"}</T>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
