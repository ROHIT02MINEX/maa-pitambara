
import { T } from "@/components/translated-text";
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
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Your profile"}</T></h1>
        <p className="mt-1 text-muted-foreground"><T>{" Keep your details up to date and manage how you sign in. "}</T></p>
      </header>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar className="h-16 w-16">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-lg"><T>{initials(user.name)}</T></AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold"><T>{user.name}</T></p>
            <p className="truncate text-sm text-muted-foreground"><T>{user.email}</T></p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge><T>{occupationLabel(user.occupation)}</T></Badge>
              {user.role === "ADMIN" ? (
                <Badge variant="warning">
                  <ShieldCheck className="h-3 w-3" /><T>{" Administrator "}</T></Badge>
              ) : null}
              {user.emailVerified ? (
                <Badge variant="success">
                  <MailCheck className="h-3 w-3" /><T>{" Verified "}</T></Badge>
              ) : (
                <Badge variant="destructive"><T>{"Unverified"}</T></Badge>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-6 text-center">
            <div>
              <dt className="text-xs text-muted-foreground"><T>{"Tests"}</T></dt>
              <dd className="text-lg font-bold"><T>{user._count.tests}</T></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground"><T>{"Bookmarks"}</T></dt>
              <dd className="text-lg font-bold"><T>{user._count.bookmarks}</T></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground"><T>{"Member since"}</T></dt>
              <dd className="text-sm font-medium"><T>{formatDate(user.createdAt)}</T></dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><T>{"Personal details"}</T></CardTitle>
            <CardDescription><T>{"Your name and mobile number."}</T></CardDescription>
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
            <CardTitle><T>{"Security"}</T></CardTitle>
            <CardDescription>
              <T>{user.passwordHash
                ? "Change the password you use to sign in."
                : "Add a password so you can sign in without Google."}</T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><T>{"Activity log"}</T></CardTitle>
          <CardDescription><T>{"Recent actions recorded on your account."}</T></CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground"><T>{"Nothing recorded yet."}</T></p>
          ) : (
            <ol className="divide-y">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1 text-sm"><T>{activityLabel(entry.action)}</T></span>
                  <span className="text-xs text-muted-foreground">
                    <T>{formatDate(entry.createdAt, true)}</T>
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
