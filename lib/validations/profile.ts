import { z } from "zod";
import { Occupation } from "@prisma/client";
import { nameSchema } from "@/lib/validations/auth";

/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 0 prefix. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number")
  .transform((v) => v.replace(/^(?:\+91|91|0)/, ""));

export const occupationSchema = z.nativeEnum(Occupation, {
  errorMap: () => ({ message: "Select your occupation" }),
});

export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  occupation: occupationSchema,
});

/** Occupation is locked once chosen — a user belongs to exactly one trade. */
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
