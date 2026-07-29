import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/profile/onboarding-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Complete your profile",
  description: "Tell us your name, mobile number and trade.",
};

export default async function OnboardingPage() {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) redirect("/login");
  if (sessionUser.profileComplete) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, occupation: true },
  });

  return (
    <div className="app-shell-bg min-h-dvh">
      <header className="container flex h-16 items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          Skill Portal
        </span>
        <div className="flex items-center gap-1">
          <SignOutButton />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="container flex justify-center pb-20 pt-6">
        <Card className="w-full max-w-2xl animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">One last step</CardTitle>
            <CardDescription>
              We need a few details before your dashboard, learning material and assessments can be
              set up for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm
              defaultName={user?.name ?? sessionUser.name}
              lockedOccupation={user?.occupation ?? null}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
