import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Shuffle,
  Target,
  TimerReset,
} from "lucide-react";

import { currentUser } from "@/lib/auth";
import {
  getInProgressTest,
  getQuestionBankSize,
  getTestHistory,
} from "@/lib/queries/learner";
import { finalizeExpiredTests } from "@/lib/test-engine";
import { occupationLabel, PASS_PERCENTAGE, TEST_QUESTION_COUNT } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";
import { getRetestOverview } from "@/lib/retest";
import { StartTestButton } from "@/components/tests/start-test-button";
import { RetestPanel } from "@/components/tests/retest-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Tests" };

const RULES = [
  { icon: ListChecks, title: `${TEST_QUESTION_COUNT} questions`, body: "Multiple choice and true/false, one mark each." },
  { icon: Clock, title: "30 minutes", body: "The clock is kept on the server and cannot be reset." },
  { icon: Shuffle, title: "Randomised", body: "Questions and their options are shuffled per attempt." },
  { icon: Target, title: `${PASS_PERCENTAGE}% to pass`, body: `That is ${Math.ceil((PASS_PERCENTAGE / 100) * TEST_QUESTION_COUNT)} correct out of ${TEST_QUESTION_COUNT}.` },
  { icon: TimerReset, title: "Auto submit", body: "When time runs out, your answers are graded as they stand." },
  { icon: CheckCircle2, title: "No negative marking", body: "Wrong answers cost nothing, so never leave a blank." },
];

export default async function TestsPage() {
  const user = await currentUser();
  if (!user?.id || !user.occupation) redirect("/onboarding");

  // Close out anything whose timer expired while the learner was away.
  await finalizeExpiredTests(user.id);

  const [inProgress, history, bankSize, retest] = await Promise.all([
    getInProgressTest(user.id),
    getTestHistory(user.id),
    getQuestionBankSize(user.occupation),
    getRetestOverview(user.id),
  ]);

  const enoughQuestions = bankSize >= TEST_QUESTION_COUNT;
  const canStart = retest.eligibility.allowed;
  const blockedMessage = retest.eligibility.allowed ? null : retest.eligibility.message;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="mt-1 text-muted-foreground">
            {occupationLabel(user.occupation)} question bank · {bankSize} question
            {bankSize === 1 ? "" : "s"} available
          </p>
        </div>
        <StartTestButton
          disabled={!enoughQuestions || !canStart}
          resumeId={inProgress?.id ?? null}
        />
      </header>

      {inProgress ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>You have a test in progress</AlertTitle>
          <AlertDescription>
            Started {formatDate(inProgress.startedAt, true)}. The timer is still running — resume it
            before it expires and is submitted automatically.
          </AlertDescription>
        </Alert>
      ) : null}

      {!enoughQuestions ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not enough questions yet</AlertTitle>
          <AlertDescription>
            A test needs {TEST_QUESTION_COUNT} questions, but only {bankSize} have been published
            for {occupationLabel(user.occupation)}. Please ask your administrator to add more.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="sr-only">
          Test rules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <li key={rule.title}>
              <Card className="h-full p-5">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <rule.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-semibold">{rule.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{rule.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <RetestPanel
        canRequest={retest.eligibility.allowed === false && retest.eligibility.reason === "needs-request"}
        blockedMessage={blockedMessage}
        requests={retest.requests}
        attemptsUsed={retest.attemptsUsed}
        freeAttempts={retest.freeAttempts}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your attempts</CardTitle>
          <CardDescription>Every completed test, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No attempts yet. Start your first test when you&apos;re ready.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Time taken</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-nowrap">
                      {test.submittedAt ? formatDate(test.submittedAt, true) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {test.score}/{test.totalQuestions}
                    </TableCell>
                    <TableCell>{test.percentage}%</TableCell>
                    <TableCell>{formatDuration(test.timeTaken)}</TableCell>
                    <TableCell>
                      <Badge variant={test.status === "PASSED" ? "success" : "destructive"}>
                        {test.status === "PASSED" ? "Passed" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/tests/result/${test.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
