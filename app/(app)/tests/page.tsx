
import { T } from "@/components/translated-text";
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
import { StartTestButton } from "@/components/tests/start-test-button";
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

  const [inProgress, history, bankSize] = await Promise.all([
    getInProgressTest(user.id),
    getTestHistory(user.id),
    getQuestionBankSize(user.occupation),
  ]);

  const enoughQuestions = bankSize >= TEST_QUESTION_COUNT;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><T>{"Assessments"}</T></h1>
          <p className="mt-1 text-muted-foreground">
            <T>{occupationLabel(user.occupation)}</T><T>{" question bank · "}</T><T>{bankSize}</T><T>{" question "}</T><T>{bankSize === 1 ? "" : "s"}</T><T>{" available "}</T></p>
        </div>
        <StartTestButton
          disabled={!enoughQuestions}
          resumeId={inProgress?.id ?? null}
        />
      </header>

      {inProgress ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle><T>{"You have a test in progress"}</T></AlertTitle>
          <AlertDescription><T>{" Started "}</T><T>{formatDate(inProgress.startedAt, true)}</T><T>{". The timer is still running, so resume it before it expires and is submitted automatically. "}</T></AlertDescription>
        </Alert>
      ) : null}

      {!enoughQuestions ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle><T>{"Not enough questions yet"}</T></AlertTitle>
          <AlertDescription><T>{" A test needs "}</T><T>{TEST_QUESTION_COUNT}</T><T>{" questions, but only "}</T><T>{bankSize}</T><T>{" have been published for "}</T><T>{occupationLabel(user.occupation)}</T><T>{". Please ask your administrator to add more. "}</T></AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="sr-only"><T>{" Test rules "}</T></h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <li key={rule.title}>
              <Card className="h-full p-5">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <rule.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-semibold"><T>{rule.title}</T></h3>
                <p className="mt-1 text-sm text-muted-foreground"><T>{rule.body}</T></p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-muted-foreground"><T>{"Practise as often as you like. No administrator approval is required."}</T></p>

      <Card>
        <CardHeader>
          <CardTitle><T>{"Your attempts"}</T></CardTitle>
          <CardDescription><T>{"Every completed test, newest first."}</T></CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"><T>{" No attempts yet. Start your first test when you're ready. "}</T></p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><T>{"Date"}</T></TableHead>
                  <TableHead><T>{"Score"}</T></TableHead>
                  <TableHead><T>{"Percentage"}</T></TableHead>
                  <TableHead><T>{"Time taken"}</T></TableHead>
                  <TableHead><T>{"Result"}</T></TableHead>
                  <TableHead className="text-right"><T>{"Review"}</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-nowrap">
                      <T>{test.submittedAt ? formatDate(test.submittedAt, true) : "-"}</T>
                    </TableCell>
                    <TableCell className="font-medium">
                      <T>{test.score}</T><T>{"/"}</T><T>{test.totalQuestions}</T>
                    </TableCell>
                    <TableCell><T>{test.percentage}</T><T>{"%"}</T></TableCell>
                    <TableCell><T>{formatDuration(test.timeTaken)}</T></TableCell>
                    <TableCell>
                      <Badge variant={test.status === "PASSED" ? "success" : "destructive"}>
                        <T>{test.status === "PASSED" ? "Passed" : "Failed"}</T>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/tests/result/${test.id}`}><T>{"View"}</T></Link>
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
