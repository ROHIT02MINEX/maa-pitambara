import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  UserCheck,
  Users,
} from "lucide-react";

import { getActivityFeed, getAdminOverview } from "@/lib/queries/admin";
import { envStatus } from "@/lib/env";
import { occupationLabel } from "@/lib/constants";
import { activityLabel } from "@/lib/activity-labels";
import { formatDate, formatDuration, initials } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { isSheetsBackupConfigured } from "@/lib/sheets-backup";
import { OccupationScoresChart, OccupationUsersChart } from "@/components/admin/admin-charts";
import { SheetsBackupCard } from "@/components/admin/sheets-backup-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminDashboardPage() {
  const [overview, activity] = await Promise.all([getAdminOverview(), getActivityFeed(12)]);
  const setup = envStatus();
  const missing = [
    !setup.storage && "Supabase Storage (PDF uploads)",
    !setup.email && "SMTP (verification and reset e-mails)",
    !setup.google && "Google OAuth",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Everything happening across the portal at a glance.
        </p>
      </header>

      {missing.length > 0 ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Optional integrations not configured</AlertTitle>
          <AlertDescription>
            {missing.join(", ")}. The portal runs without them, but those features stay disabled
            until the environment variables are set. See the README for the full list.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={overview.totals.totalUsers}
          hint={`${overview.totals.activeUsers} active · ${overview.totals.disabledUsers} disabled`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="PDF documents"
          value={overview.totals.totalPdfs}
          hint="Across all trades"
          icon={FileText}
        />
        <StatCard
          label="Questions"
          value={overview.totals.totalQuestions}
          hint="In the combined bank"
          icon={FileQuestion}
        />
        <StatCard
          label="Tests completed"
          value={overview.totals.completedTests}
          hint={`${overview.totals.inProgressTests} in progress`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Average score"
          value={`${overview.totals.averageScore}%`}
          icon={BarChart3}
        />
        <StatCard
          label="Pass rate"
          value={`${overview.totals.passRate}%`}
          icon={UserCheck}
          tone={overview.totals.passRate >= 50 ? "success" : "warning"}
        />
        <StatCard
          label="Average time"
          value={formatDuration(overview.totals.averageTime)}
          hint="Per completed attempt"
          icon={Clock}
        />
        <StatCard
          label="Without a trade"
          value={overview.totals.unassignedUsers}
          hint="Profile not completed"
          icon={AlertTriangle}
          tone={overview.totals.unassignedUsers > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.occupationCounts.map((row) => (
          <Card key={row.occupation} className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              {occupationLabel(row.occupation)}
            </p>
            <p className="mt-1 text-2xl font-bold">{row.users}</p>
            <p className="text-xs text-muted-foreground">
              registered learner{row.users === 1 ? "" : "s"}
            </p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <OccupationUsersChart data={overview.occupationCounts} />
        <OccupationScoresChart data={overview.occupationScores} />
      </div>

      <SheetsBackupCard configured={isSheetsBackupConfigured()} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent logins</CardTitle>
              <CardDescription>Who has signed in most recently</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/users">All users</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.recentLogins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sign-ins recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {overview.recentLogins.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar>
                      {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{occupationLabel(user.occupation)}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent test attempts</CardTitle>
              <CardDescription>The latest submitted assessments</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/analytics">Analytics</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts submitted yet.</p>
            ) : (
              <ul className="divide-y">
                {overview.recentAttempts.map((test) => (
                  <li key={test.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{test.user.name ?? test.user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {occupationLabel(test.occupation)} ·{" "}
                        {test.submittedAt ? formatDate(test.submittedAt, true) : "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {test.score}/{test.totalQuestions}
                    </p>
                    <Badge variant={test.status === "PASSED" ? "success" : "destructive"}>
                      {test.percentage}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>The most recent auditable actions across the portal.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ol className="divide-y">
              {activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                  <span className="flex-1 text-sm">
                    <strong className="font-medium">{activityLabel(entry.action)}</strong>
                    {entry.user ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {entry.user.name ?? entry.user.email}
                      </span>
                    ) : null}
                    {entry.detail ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {entry.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.createdAt, true)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
