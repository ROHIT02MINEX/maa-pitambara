
import { T } from "@/components/translated-text";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";

import { currentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries/learner";
import { occupationLabel, PASS_PERCENTAGE } from "@/lib/constants";
import { activityLabel } from "@/lib/activity-labels";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user?.id || !user.occupation) redirect("/onboarding");

  const { stats, recentTests, latestPdfs, activity } = await getDashboardData(
    user.id,
    user.occupation,
  );

  const firstName = (user.name ?? "there").split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="glass rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground"><T>{"Welcome back,"}</T></p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight"><T>{firstName}</T><T>{" 👋"}</T></h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge><T>{occupationLabel(user.occupation)}</T></Badge>
              <Badge variant="secondary"><T>{"Pass mark "}</T><T>{PASS_PERCENTAGE}</T><T>{"%"}</T></Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/tests"><T>{" Take a test "}</T><ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/learn">
                <BookOpen className="h-4 w-4" /><T>{" Study material "}</T></Link>
            </Button>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium"><T>{"Course completion"}</T></span>
            <span className="text-muted-foreground"><T>{stats.completionPercentage}</T><T>{"%"}</T></span>
          </div>
          <Progress
            value={stats.completionPercentage}
            aria-label={`Course completion ${stats.completionPercentage} percent`}
          />
          <p className="text-xs text-muted-foreground"><T>{" Based on the material you have opened ("}</T><T>{stats.pdfsViewed}</T><T>{"/"}</T><T>{stats.pdfsAvailable}</T><T>{") and your best test result ("}</T><T>{stats.highestScore}</T><T>{"%). "}</T></p>
        </div>
      </section>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tests completed"
          value={stats.completedTests}
          hint={`${stats.passedTests} passed · ${stats.failedTests} failed`}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Average score"
          value={`${stats.averageScore}%`}
          hint="Across all your attempts"
          icon={TrendingUp}
          tone="default"
        />
        <StatCard
          label="Best score"
          value={`${stats.highestScore}%`}
          hint={stats.highestScore >= PASS_PERCENTAGE ? "Above the pass mark" : "Keep going"}
          icon={Award}
          tone={stats.highestScore >= PASS_PERCENTAGE ? "success" : "warning"}
        />
        <StatCard
          label="Material opened"
          value={`${stats.pdfsViewed}/${stats.pdfsAvailable}`}
          hint={`${stats.bookmarks} bookmarked`}
          icon={FileText}
          tone="default"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle><T>{"Latest study material"}</T></CardTitle>
              <CardDescription><T>{"Newest PDFs for "}</T><T>{occupationLabel(user.occupation)}</T></CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/learn"><T>{" View all "}</T><ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestPdfs.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><T>{" No material has been published for your trade yet. Check back soon. "}</T></p>
            ) : (
              <ul className="divide-y">
                {latestPdfs.map((pdf) => (
                  <li key={pdf.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium"><T>{pdf.title}</T></p>
                      <p className="truncate text-xs text-muted-foreground">
                        <T>{pdf.topic ? `${pdf.topic} · ` : ""}</T>
                        <T>{formatBytes(pdf.fileSize)}</T><T>{" · "}</T><T>{formatDate(pdf.createdAt)}</T>
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/learn?highlight=${pdf.id}`}><T>{"Open"}</T></Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><T>{"Recent activity"}</T></CardTitle>
            <CardDescription><T>{"Your last actions on the portal"}</T></CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground"><T>{"Nothing here yet."}</T></p>
            ) : (
              <ol className="space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium"><T>{activityLabel(entry.action)}</T></p>
                      <p className="text-xs text-muted-foreground">
                        <T>{formatDate(entry.createdAt, true)}</T>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle><T>{"Recent test results"}</T></CardTitle>
            <CardDescription><T>{"Your five most recent attempts"}</T></CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/progress"><T>{" Full progress "}</T><ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground"><T>{" You haven't taken a test yet. Twenty questions, thirty minutes. Give it a go. "}</T></p>
              <Button asChild className="mt-4">
                <Link href="/tests"><T>{"Start your first test"}</T></Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recentTests.map((test) => (
                <li key={test.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                      test.status === "PASSED"
                        ? "bg-success/15 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <T>{test.score}</T><T>{"/"}</T><T>{test.totalQuestions}</T><T>{" · "}</T><T>{test.percentage}</T><T>{"% "}</T></p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden /> <T>{formatDuration(test.timeTaken)}</T><T>{" ·"}</T><T>{" "}</T>
                      <T>{test.submittedAt ? formatDate(test.submittedAt, true) : "-"}</T>
                    </p>
                  </div>
                  <Badge variant={test.status === "PASSED" ? "success" : "destructive"}>
                    <T>{test.status === "PASSED" ? "Passed" : "Failed"}</T>
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tests/result/${test.id}`}><T>{"Review"}</T></Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
