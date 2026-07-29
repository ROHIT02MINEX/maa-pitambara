"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import type { Occupation } from "@prisma/client";

import { updateProfileAction } from "@/actions/profile";
import { runAction } from "@/lib/run-action";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validations/profile";
import { OCCUPATION_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ProfileForm({
  defaultValues,
  email,
  occupation,
}: {
  defaultValues: ProfileUpdateInput;
  email: string;
  occupation: Occupation | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues,
  });

  async function onSubmit(values: ProfileUpdateInput) {
    setFormError(null);
    const result = await runAction(() => updateProfileAction(values));

    if (!result.ok) {
      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ProfileUpdateInput, { message: messages[0] });
      }
      return;
    }

    toast.success(result.message ?? "Profile updated.");
    reset(values);
    await update();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail address</Label>
          <Input id="email" value={email} readOnly disabled />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> Your sign-in address cannot be changed here.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            id="occupation"
            value={occupation ? OCCUPATION_LABELS[occupation] : "Not set"}
            readOnly
            disabled
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> Each learner belongs to exactly one trade.
          </p>
        </div>
      </div>

      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        Save changes
      </Button>
    </form>
  );
}
