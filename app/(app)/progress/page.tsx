import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, CheckCircle2, ClipboardList, TrendingUp, XCircle } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { getProgressData } from "@/lib/queries/learner";
import { occupationLabel, PASS_PERCENTAGE } from "@/lib/constants";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  PassFailChart,
  ScoreTrendChart,
  TopicAccuracyChart,
} from "@/components/progress/progress-charts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await currentUser();
  if (!user?.id || !user.occupation) redirect("/onboarding");

  const { totals, timeline, topicAccuracy } = await getProgressData(user.id, user.occupation);
  const weakest = topicAccuracy.filter((topic) => topic.accuracy < PASS_PERCENTAGE).slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
          <p className="mt-1 text-muted-foreground">
            {occupationLabel(user.occupation)} · {totals.totalTests} completed attempt
            {totals.totalTests === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/tests">Take a test</Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total tests"
          value={totals.totalTests}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Highest score"
          value={`${totals.highestScore}%`}
          icon={Award}
          tone={totals.highestScore >= PASS_PERCENTAGE ? "success" : "warning"}
        />
        <StatCard label="Average score" value={`${totals.averageScore}%`} icon={TrendingUp} />
        <StatCard label="Passed" value={totals.passed} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={totals.failed} icon={XCircle} tone="destructive" />
        <StatCard
          label="Material opened"
          value={`${totals.materialViewed}/${totals.materialTotal}`}
          icon={BookOpen}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Course completion</CardTitle>
          <CardDescription>
            Half from the material you have opened, half from your best assessment result.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall</span>
            <span className="text-muted-foreground">{totals.completionPercentage}%</span>
          </div>
          <Progress
            value={totals.completionPercentage}
            aria-label={`Course completion ${totals.completionPercentage} percent`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreTrendChart data={timeline} />
        <PassFailChart passed={totals.passed} failed={totals.failed} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopicAccuracyChart data={topicAccuracy} />

        <Card>
          <CardHeader>
            <CardTitle>Focus areas</CardTitle>
            <CardDescription>
              Topics where your accuracy is below the {PASS_PERCENTAGE}% pass mark.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weakest.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {totals.totalTests === 0
                  ? "Complete a test to see which topics need work."
                  : "Nothing below the pass mark. Well done."}
              </p>
            ) : (
              <ul className="space-y-3">
                {weakest.map((topic) => (
                  <li key={topic.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{topic.topic}</span>
                      <Badge variant={topic.accuracy < 40 ? "destructive" : "warning"}>
                        {topic.accuracy}%
                      </Badge>
                    </div>
                    <Progress
                      value={topic.accuracy}
                      indicatorClassName={
                        topic.accuracy < 40 ? "bg-destructive" : "bg-warning"
                      }
                      aria-label={`${topic.topic} accuracy ${topic.accuracy} percent`}
                    />
                    <p className="text-xs text-muted-foreground">
                      {topic.attempts} question{topic.attempts === 1 ? "" : "s"} seen
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/learn">
                <BookOpen className="h-4 w-4" /> Revise the material
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
