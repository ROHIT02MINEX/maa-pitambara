import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, MailCheck, ShieldCheck } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { occupationLabel } from "@/lib/constants";
import { activityLabel } from "@/lib/activity-labels";
import { formatDate, initials } from "@/lib/utils";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      occupation: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      passwordHash: true,
      _count: { select: { tests: true, bookmarks: true } },
    },
  });
  if (!user) redirect("/login");

  const activity = await prisma.activityLog.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, action: true, createdAt: true, ip: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-1 text-muted-foreground">
          Keep your details up to date and manage how you sign in.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar className="h-16 w-16">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{occupationLabel(user.occupation)}</Badge>
              {user.role === "ADMIN" ? (
                <Badge variant="warning">
                  <ShieldCheck className="h-3 w-3" /> Administrator
                </Badge>
              ) : null}
              {user.emailVerified ? (
                <Badge variant="success">
                  <MailCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive">Unverified</Badge>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-6 text-center">
            <div>
              <dt className="text-xs text-muted-foreground">Tests</dt>
              <dd className="text-lg font-bold">{user._count.tests}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bookmarks</dt>
              <dd className="text-lg font-bold">{user._count.bookmarks}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd className="text-sm font-medium">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Your name and mobile number.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{ name: user.name ?? "", phone: user.phone ?? "" }}
              email={user.email}
              occupation={user.occupation}
            />
          </CardContent>
        </Card>

        <Card id="security">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              {user.passwordHash
                ? "Change the password you use to sign in."
                : "Add a password so you can sign in without Google."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>Recent actions recorded on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ol className="divide-y">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1 text-sm">{activityLabel(entry.action)}</span>
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
