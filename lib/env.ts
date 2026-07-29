import { z } from "zod";

/**
 * Runtime environment validation. Anything that is genuinely required for the
 * app to boot is `required`; optional integrations degrade gracefully and are
 * reported through `envStatus()` in the admin panel.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Postgres URL"),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_PDF_BUCKET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  EMAIL_FROM: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Non-throwing feature flags, used to render setup hints in the admin panel. */
export function envStatus() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    storage: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    email: Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM),
  };
}

/**
 * Whether new accounts must confirm their e-mail address before signing in.
 *
 * Defaults to "only when e-mail can actually be delivered". Requiring
 * verification on a deployment with no SMTP would lock every user out
 * permanently — the link is written to the server log, which a learner cannot
 * reach. Set `REQUIRE_EMAIL_VERIFICATION` explicitly to override in either
 * direction.
 */
export function emailVerificationRequired(): boolean {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION?.toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return envStatus().email;
}

export const isProduction = process.env.NODE_ENV === "production";
