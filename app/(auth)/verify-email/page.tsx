
import { T } from "@/components/translated-text";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailQuestion, XCircle } from "lucide-react";

import { verifyEmailAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ResendVerification } from "@/components/auth/resend-verification";

export const metadata: Metadata = {
  title: "Verify e-mail",
  description: "Confirm your e-mail address to activate your account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailQuestion className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight"><T>{"Verify your e-mail"}</T></h1>
          <p className="text-sm text-muted-foreground"><T>{" Open the link we sent you. If it has expired, request a fresh one below. "}</T></p>
        </div>
        <ResendVerification />
        <Button asChild variant="ghost" className="w-full">
          <Link href="/login"><T>{"Back to sign in"}</T></Link>
        </Button>
      </div>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <div className="space-y-6 text-center">
      <span
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
          result.ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        {result.ok ? (
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        ) : (
          <XCircle className="h-7 w-7" aria-hidden />
        )}
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          <T>{result.ok ? "E-mail verified" : "Verification failed"}</T>
        </h1>
        <p className="text-sm text-muted-foreground">
          <T>{result.ok ? result.message : result.error}</T>
        </p>
      </div>

      {result.ok ? (
        <Button asChild className="w-full">
          <Link href="/login"><T>{"Sign in"}</T></Link>
        </Button>
      ) : (
        <>
          <ResendVerification />
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login"><T>{"Back to sign in"}</T></Link>
          </Button>
        </>
      )}
    </div>
  );
}
