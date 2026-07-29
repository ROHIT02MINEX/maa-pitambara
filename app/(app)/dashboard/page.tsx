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
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{firstName} 👋</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{occupationLabel(user.occupation)}</Badge>
              <Badge variant="secondary">Pass mark {PASS_PERCENTAGE}%</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/tests">
                Take a test <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/learn">
                <BookOpen className="h-4 w-4" /> Study material
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Course completion</span>
            <span className="text-muted-foreground">{stats.completionPercentage}%</span>
          </div>
          <Progress
            value={stats.completionPercentage}
            aria-label={`Course completion ${stats.completionPercentage} percent`}
          />
          <p className="text-xs text-muted-foreground">
            Based on the material you have opened ({stats.pdfsViewed}/{stats.pdfsAvailable}) and
            your best test result ({stats.highestScore}%).
          </p>
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
              <CardTitle>Latest study material</CardTitle>
              <CardDescription>Newest PDFs for {occupationLabel(user.occupation)}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/learn">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestPdfs.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No material has been published for your trade yet. Check back soon.
              </p>
            ) : (
              <ul className="divide-y">
                {latestPdfs.map((pdf) => (
                  <li key={pdf.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{pdf.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {pdf.topic ? `${pdf.topic} · ` : ""}
                        {formatBytes(pdf.fileSize)} · {formatDate(pdf.createdAt)}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/learn?highlight=${pdf.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your last actions on the portal</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ol className="space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{activityLabel(entry.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt, true)}
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
            <CardTitle>Recent test results</CardTitle>
            <CardDescription>Your five most recent attempts</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/progress">
              Full progress <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t taken a test yet. Twenty questions, thirty minutes — give it a go.
              </p>
              <Button asChild className="mt-4">
                <Link href="/tests">Start your first test</Link>
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
                      {test.score}/{test.totalQuestions} · {test.percentage}%
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden /> {formatDuration(test.timeTaken)} ·{" "}
                      {test.submittedAt ? formatDate(test.submittedAt, true) : "—"}
                    </p>
                  </div>
                  <Badge variant={test.status === "PASSED" ? "success" : "destructive"}>
                    {test.status === "PASSED" ? "Passed" : "Failed"}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tests/result/${test.id}`}>Review</Link>
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
