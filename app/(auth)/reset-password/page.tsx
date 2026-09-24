
import { T } from "@/components/translated-text";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight"><T>{"Reset link missing"}</T></h1>
          <p className="text-sm text-muted-foreground"><T>{" This page needs a valid reset link. Request a new one to continue. "}</T></p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password"><T>{"Request a new link"}</T></Link>
        </Button>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
