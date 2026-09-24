"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";

import { forgotPasswordAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    const result = await runAction(() => forgotPasswordAction(values));
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSent(result.message ?? "Check your inbox.");
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight"><T>{"Check your e-mail"}</T></h1>
          <p className="text-sm text-muted-foreground"><T>{sent}</T></p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" /><T>{" Back to sign in "}</T></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Forgot your password?"}</T></h1>
        <p className="text-sm text-muted-foreground"><T>{" Enter the e-mail address on your account and we'll send a reset link. "}</T></p>
      </header>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription><T>{formError}</T></AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email"><T>{"E-mail address"}</T></Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive"><T>{errors.email.message}</T></p> : null}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}><T>{" Send reset link "}</T></Button>
      </form>

      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">
          <ArrowLeft className="h-4 w-4" /><T>{" Back to sign in "}</T></Link>
      </Button>
    </div>
  );
}
