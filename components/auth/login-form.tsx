"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "@/lib/toast";

import { loginAction, resendVerificationAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleButton } from "@/components/auth/google-button";

export function LoginForm({
  callbackUrl,
  googleEnabled,
}: {
  callbackUrl?: string;
  /** False when the deployment has no Google OAuth credentials configured. */
  googleEnabled: boolean;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    setNeedsVerification(false);

    const result = await runAction(() => loginAction(values));

    if (!result.ok) {
      setFormError(result.error);
      if (result.error.toLowerCase().includes("verify")) setNeedsVerification(true);
      return;
    }


    setRedirecting(true);
    toast.success("Signed in! Redirecting...");
    const targetUrl = callbackUrl || result.data?.redirectTo || "/dashboard";
    window.location.assign(targetUrl);
  }

  async function handleResend() {
    setResending(true);
    const result = await runAction(() =>
      resendVerificationAction({ email: getValues("email") }),
    );
    setResending(false);
    if (result.ok) toast.success(result.message ?? "Verification e-mail sent.");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Welcome back"}</T></h1>
        <p className="text-sm text-muted-foreground"><T>{" Sign in to continue your training and assessments. "}</T></p>
      </header>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription className="space-y-3">
            <p><T>{formError}</T></p>
            {needsVerification ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={resending}
                onClick={handleResend}
              >
                <Mail className="h-4 w-4" /><T>{" Resend verification e-mail "}</T></Button>
            ) : null}
          </AlertDescription>
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
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              <T>{errors.email.message}</T>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password"><T>{"Password"}</T></Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            ><T>{" Forgot password? "}</T></Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              <T>{errors.password.message}</T>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={watch("remember")}
            onCheckedChange={(checked) => setValue("remember", checked === true)}
          />
          <Label htmlFor="remember" className="cursor-pointer font-normal text-muted-foreground"><T>{" Remember me on this device "}</T></Label>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting || redirecting} disabled={isSubmitting || redirecting}>
          <T>{redirecting ? "Signing in..." : "Sign in"}</T>
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground"><T>{"or"}</T></span>
            </div>
          </div>

          <GoogleButton callbackUrl={callbackUrl || "/dashboard"} />
        </>
      ) : null}

      <p className="text-center text-sm text-muted-foreground"><T>{" Don't have an account?"}</T><T>{" "}</T>
        <Link href="/signup" className="font-medium text-primary hover:underline"><T>{" Create one "}</T></Link>
      </p>
    </div>
  );
}
