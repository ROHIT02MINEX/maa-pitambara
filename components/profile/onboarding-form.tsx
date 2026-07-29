"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Occupation } from "@prisma/client";

import { createProfileAction } from "@/actions/profile";
import { runAction } from "@/lib/run-action";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { OCCUPATIONS, OCCUPATION_DESCRIPTIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function OnboardingForm({
  defaultName,
  lockedOccupation,
}: {
  defaultName?: string | null;
  lockedOccupation?: Occupation | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultName ?? "",
      phone: "",
      occupation: lockedOccupation ?? undefined,
    },
  });

  const occupation = watch("occupation");

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    const result = await runAction(() => createProfileAction(values));

    if (!result.ok) {
      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ProfileInput, { message: messages[0] });
      }
      return;
    }

    toast.success(result.message ?? "Profile saved.");
    // Refresh the JWT so `profileComplete` flips before the redirect.
    await update();
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
        </div>
      </div>

      <fieldset className="space-y-3" disabled={Boolean(lockedOccupation)}>
        <legend className="text-sm font-medium">Occupation</legend>
        <p className="text-sm text-muted-foreground">
          {lockedOccupation
            ? "Your occupation has already been set and cannot be changed."
            : "Choose carefully — each learner belongs to exactly one trade, and this cannot be changed later."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {OCCUPATIONS.map((value) => {
            const selected = occupation === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all",
                  "focus-within:ring-2 focus-within:ring-ring",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent/50",
                  lockedOccupation && !selected && "opacity-50",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="occupation"
                  value={value}
                  checked={selected}
                  onChange={() => setValue("occupation", value, { shouldValidate: true })}
                />
                <span className="flex items-center justify-between font-medium">
                  {OCCUPATION_LABELS[value]}
                  <span
                    aria-hidden
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      selected ? "border-primary bg-primary" : "border-muted-foreground/40",
                    )}
                  />
                </span>
                <span className="text-xs text-muted-foreground">
                  {OCCUPATION_DESCRIPTIONS[value]}
                </span>
              </label>
            );
          })}
        </div>

        {errors.occupation ? (
          <p className="text-sm text-destructive">{errors.occupation.message}</p>
        ) : null}
      </fieldset>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Save profile and continue
      </Button>
    </form>
  );
}
