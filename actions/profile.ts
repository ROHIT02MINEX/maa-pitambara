"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ACTIVITY, logActivity } from "@/lib/activity";
import { limitByKey, RATE_LIMITS } from "@/lib/rate-limit";
import { profileSchema, profileUpdateSchema } from "@/lib/validations/profile";
import { actionError, actionOk, type ActionResult } from "@/types";

/** First-run profile creation. Sets the (immutable) occupation. */
export async function createProfileAction(input: unknown): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const limit = limitByKey("mutation", sessionUser.id, RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
  if (!limit.success) return actionError("Too many requests. Please slow down.");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { occupation: true },
  });
  if (!existing) return actionError("Account not found.");

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      // A user belongs to exactly one occupation — never overwrite it.
      occupation: existing.occupation ?? parsed.data.occupation,
    },
  });

  await logActivity({
    userId: sessionUser.id,
    action: ACTIVITY.PROFILE_CREATED,
    detail: existing.occupation ?? parsed.data.occupation,
  });

  revalidatePath("/", "layout");
  return actionOk(undefined, "Profile saved. Welcome aboard!");
}

/** Profile editing. Name and phone only; occupation stays fixed. */
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return actionError("You must be signed in.");

  const limit = limitByKey("mutation", sessionUser.id, RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
  if (!limit.success) return actionError("Too many requests. Please slow down.");

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });

  await logActivity({ userId: sessionUser.id, action: ACTIVITY.PROFILE_UPDATED });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return actionOk(undefined, "Profile updated.");
}
