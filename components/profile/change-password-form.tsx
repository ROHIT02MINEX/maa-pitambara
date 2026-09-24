"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/lib/toast";

import { changePasswordAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrength } from "@/components/auth/password-strength";

/**
 * `hasPassword` is false for accounts created through Google — in that case the
 * form sets a password for the first time instead of changing one.
 */
export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null);
    const result = await runAction(() => changePasswordAction(values));

    if (!result.ok) {
      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ChangePasswordInput, { message: messages[0] });
      }
      return;
    }

    toast.success(result.message ?? "Password changed.");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription><T>{formError}</T></AlertDescription>
        </Alert>
      ) : null}

      {!hasPassword ? (
        <Alert variant="info">
          <AlertDescription><T>{" You signed up with Google. Set a password here if you also want to sign in with your e-mail address, so type anything in the first field; it is not checked for accounts without an existing password. "}</T></AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="currentPassword"><T>{"Current password"}</T></Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <p className="text-sm text-destructive"><T>{errors.currentPassword.message}</T></p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword"><T>{"New password"}</T></Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...register("newPassword")}
        />
        <PasswordStrength password={watch("newPassword") ?? ""} />
        {errors.newPassword ? (
          <p className="text-sm text-destructive"><T>{errors.newPassword.message}</T></p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword"><T>{"Confirm new password"}</T></Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive"><T>{errors.confirmPassword.message}</T></p>
        ) : null}
      </div>

      <Button type="submit" loading={isSubmitting}>
        <T>{hasPassword ? "Change password" : "Set password"}</T>
      </Button>
    </form>
  );
}
