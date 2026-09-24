"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast";

import { resetPasswordAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrength } from "@/components/auth/password-strength";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    const result = await runAction(() => resetPasswordAction(values));

    if (!result.ok) {
      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ResetPasswordInput, { message: messages[0] });
      }
      return;
    }

    setDone(true);
    toast.success(result.message ?? "Password updated.");
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight"><T>{"Password updated"}</T></h1>
          <p className="text-sm text-muted-foreground"><T>{" You can now sign in with your new password. "}</T></p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login"><T>{"Go to sign in"}</T></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight"><T>{"Choose a new password"}</T></h1>
        <p className="text-sm text-muted-foreground"><T>{" Pick something you haven't used elsewhere. "}</T></p>
      </header>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription><T>{formError}</T></AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <input type="hidden" {...register("token")} />

        <div className="space-y-2">
          <Label htmlFor="password"><T>{"New password"}</T></Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          <PasswordStrength password={watch("password") ?? ""} />
          {errors.password ? (
            <p className="text-sm text-destructive"><T>{errors.password.message}</T></p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword"><T>{"Confirm new password"}</T></Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive"><T>{errors.confirmPassword.message}</T></p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}><T>{" Update password "}</T></Button>
      </form>
    </div>
  );
}
