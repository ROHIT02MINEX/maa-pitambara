"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { loginAction, registerAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordStrength } from "@/components/auth/password-strength";

export function SignupForm({
  googleEnabled,
}: {
  /** False when the deployment has no Google OAuth credentials configured. */
  googleEnabled: boolean;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [redirecting, setRedirecting] = React.useState(false);
  const [done, setDone] = React.useState<{
    email: string;
    emailSent: boolean;
    verificationRequired: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const password = watch("password");

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    const result = await runAction(() => registerAction(values));

    if (!result.ok) {
      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof SignupInput, { message: messages[0] });
      }
      return;
    }

    const verificationRequired = result.data?.verificationRequired ?? false;

    if (!verificationRequired) {
      // Auto-login after registration when verification is not required
      setRedirecting(true);
      toast.success("Account created! Setting up your session...");
      const loginRes = await runAction(() =>
        loginAction({ email: values.email, password: values.password, remember: true }),
      );

      if (loginRes.ok && !loginRes.data?.approvalRequired) {
        window.location.assign(loginRes.data?.redirectTo || "/onboarding");
        return;
      }

      if (loginRes.ok && loginRes.data?.approvalRequired) {
        toast.success("Account created. Login request submitted for administrator approval.");
        setDone({
          email: values.email,
          emailSent: false,
          verificationRequired: false,
        });
        setRedirecting(false);
        return;
      }
    }

    toast.success(result.message ?? "Account created.");
    setDone({
      email: values.email,
      emailSent: result.data?.emailSent ?? false,
      verificationRequired,
    });
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {done.verificationRequired ? "Check your inbox" : "Account created"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {done.verificationRequired ? (
              <>
                We sent a verification link to{" "}
                <strong className="text-foreground">{done.email}</strong>. Confirm your address,
                then sign in to set up your profile.
              </>
            ) : (
              <>
                Your account for <strong className="text-foreground">{done.email}</strong> is
                ready. Sign in to choose your trade and set up your profile.
              </>
            )}
          </p>
        </div>

        {done.verificationRequired && !done.emailSent ? (
          <Alert variant="warning">
            <AlertDescription>
              E-mail delivery is not configured on this deployment, so the verification link was
              written to the server log instead. Ask your administrator for it, or configure SMTP.
            </AlertDescription>
          </Alert>
        ) : null}

        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll choose your trade right after signing up.
        </p>
      </header>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ramesh Kumar"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-10"
              aria-invalid={Boolean(errors.password)}
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
          <PasswordStrength password={password ?? ""} />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting || redirecting} disabled={isSubmitting || redirecting}>
          {redirecting ? "Setting up account..." : "Create account"}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <GoogleButton callbackUrl="/onboarding" label="Sign up with Google" />
        </>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
