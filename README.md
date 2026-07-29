# Skill Learning & Assessment Portal

A production-ready, full-stack web application for occupation-wise skill training and
assessment. Trainees pick one of four trades — **Fitter**, **Electrician**, **Solar
Technician** or **Basic Cosmetology** — and get study material and timed tests belonging
to that trade only. Administrators manage users, PDFs, question banks and reports from a
dedicated panel.

---

## Contents

- [Feature overview](#feature-overview)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Google OAuth setup](#google-oauth-setup)
- [E-mail (SMTP) setup](#e-mail-smtp-setup)
- [Database migrations & seed data](#database-migrations--seed-data)
- [Docker](#docker)
- [Deploying to Vercel](#deploying-to-vercel)
- [Assessment rules](#assessment-rules)
- [CSV bulk import format](#csv-bulk-import-format)
- [Security notes](#security-notes)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Feature overview

### Authentication
- E-mail + password sign-up and sign-in, with **bcrypt** hashing (12 rounds).
- **Google OAuth** — a Google sign-in creates the user record automatically and sends
  them straight to profile creation.
- **E-mail verification** is enforced: credential accounts cannot sign in until the
  address is confirmed.
- **Forgot password** and **reset password** with single-use, hashed, 1-hour tokens.
- **Remember me** — unchecked, the session cookie expires when the browser closes.
- Change password from the profile page (Google-only accounts can add one).

### Learner experience
- **Profile creation** after sign-up: full name, mobile number and occupation. A learner
  belongs to exactly one occupation, and it is immutable afterwards.
- **Dashboard** — welcome, occupation, completion progress, tests completed, best and
  average score, newest PDFs, recent activity.
- **Learning material** — occupation-filtered PDF library with search, bookmarks,
  view tracking, in-browser reading and download.
- **Tests** — 20 random questions, 30-minute server-side timer, randomised question and
  option order, autosaving answers, a review step and automatic submission on timeout.
- **Results** — score, percentage, correct/wrong/unanswered counts, pass or fail, time
  taken, a full answer review with explanations, and recommended PDFs for weak topics.
- **Progress** — totals, highest/average score, pass/fail split, score trend chart and
  per-topic accuracy.

### Admin panel
- **Overview** — user totals, occupation-wise breakdown, PDF and question counts,
  average score, pass rate, recent logins, recent attempts and the audit log.
- **Users** — search, filter, edit, disable/enable, delete and issue password resets.
- **PDFs** — upload, edit, replace the file, delete and assign to an occupation.
- **Questions** — full CRUD across both question types, per-question activation, and
  **CSV bulk import** with per-row error reporting.
- **Test analytics** — every attempt with the learner's name, phone, occupation, score,
  correct/wrong counts, time taken and status; filter by occupation, date, score and
  result; export to **CSV, Excel or PDF**.

### Interface
Glassmorphism dashboard, dark mode, loading skeletons, toast notifications, animations,
responsive from 360 px up, keyboard-accessible components and WCAG-minded contrast,
focus rings, labels and live regions.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Auth | Auth.js (NextAuth v5) — Credentials + Google, JWT sessions |
| Storage | Supabase Storage (direct-to-bucket signed uploads) |
| Validation | Zod + React Hook Form |
| Charts | Recharts |
| E-mail | Nodemailer (SMTP) |
| Exports | ExcelJS, jsPDF + AutoTable, native CSV |
| Hosting | Vercel (or Docker anywhere) |

---

## Quick start

```bash
git clone <your-repo-url> skill-portal
cd skill-portal
npm install
cp .env.example .env      # then fill in the values (see below)
npm run db:deploy         # apply migrations
npm run db:seed           # admin user + 80 starter questions
npm run dev
```

Open <http://localhost:3000>.

Default administrator (change the password immediately, or set `ADMIN_PASSWORD` before
seeding):

```
admin@skillportal.local / ChangeMe123!
```

> On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`.

---

## Environment variables

Every variable lives in [`.env.example`](./.env.example). Required ones are marked.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Pooled Postgres connection used at runtime |
| `DIRECT_URL` | ✅ | Direct connection used by `prisma migrate` |
| `AUTH_SECRET` | ✅ | Session/JWT signing key — 32+ random characters |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public origin; used to build e-mail links |
| `AUTH_URL` | — | Only if Auth.js cannot infer the URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enables "Continue with Google" |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL (PDF storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Public key used for the signed upload PUT |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server-side key that issues signed upload URLs |
| `SUPABASE_PDF_BUCKET` | — | Bucket name (default `pdfs`) |
| `SMTP_HOST`/`PORT`/`SECURE`/`USER`/`PASSWORD` | — | Outgoing e-mail |
| `EMAIL_FROM` | — | From header on outgoing e-mail |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | — | Used by the seed script only |

Generate a secret:

```bash
openssl rand -base64 32
```

**Optional integrations degrade gracefully.** Without Google credentials the button is
hidden; without SMTP, verification and reset links are written to the server log so
local development still works end to end; without Supabase Storage, PDF uploading is
disabled and the admin panel says so. The admin overview lists whatever is missing.

---

## Supabase setup

1. Create a project at <https://supabase.com>.
2. **Connection strings** — *Project settings → Database*:
   - `DATABASE_URL`: the **Transaction pooler** string (port `6543`). Append
     `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: the **Session pooler / direct** string (port `5432`).
3. **API keys** — *Project settings → API*: copy the project URL, the `anon` public key
   and the `service_role` secret key.

   > The deployed instance connects as a dedicated `skill_app` Postgres role rather
   > than the project's `postgres` role, so the master database password is never
   > used by the application. To rotate it:
   >
   > ```sql
   > ALTER ROLE skill_app WITH PASSWORD 'new-password';
   > ```
   >
   > then update `DATABASE_URL` and `DIRECT_URL`. Both URLs go through Supavisor
   > (`aws-1-<region>.pooler.supabase.com`) because `db.<ref>.supabase.co` is
   > IPv6-only and unreachable from most IPv4 networks and CI runners.
4. **Storage bucket** — *Storage → New bucket*:
   - Name: `pdfs`
   - Public bucket: **on** (learners fetch PDFs directly by URL)
   - Allowed MIME types: `application/pdf`
   - File size limit: `25 MB`

   The application enforces the same MIME type and size limit server-side before a
   database row is written, and deletes any object that fails the check.

> Uploads go **straight from the admin's browser to Supabase Storage** using a one-time
> signed URL minted by the server. Nothing large passes through the serverless function,
> so the 4.5 MB request-body limit on Vercel never applies.

---

## Google OAuth setup

1. <https://console.cloud.google.com> → *APIs & Services → Credentials*.
2. *Create credentials → OAuth client ID → Web application*.
3. **Authorised JavaScript origins**: `https://your-app.vercel.app` (and
   `http://localhost:3000` for development).
4. **Authorised redirect URIs**:
   - `https://your-app.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
5. Copy the client ID and secret into `.env`.

Google accounts are linked to an existing e-mail address automatically — Google verifies
address ownership, so this is safe.

---

## E-mail (SMTP) setup

Any SMTP provider works (Resend, SendGrid, Amazon SES, Gmail app password, your
institution's mail server):

```env
SMTP_HOST="smtp.resend.com"
SMTP_PORT="587"
SMTP_SECURE="false"     # "true" only for port 465
SMTP_USER="resend"
SMTP_PASSWORD="re_xxxxxxxx"
EMAIL_FROM="Skill Portal <no-reply@yourdomain.in>"
```

If `SMTP_HOST` is unset, e-mails are not sent — the full message, including the
verification or reset link, is logged to the server console instead.

---

## Database migrations & seed data

```bash
npm run db:deploy    # apply committed migrations (production)
npm run db:migrate   # create a new migration during development
npm run db:push      # push the schema without a migration (prototyping only)
npm run db:seed      # administrator + 80 starter questions
npm run db:studio    # browse the data
```

The initial migration lives in `prisma/migrations/20260101000000_init/`.

The seed inserts **20 questions per occupation** — exactly the number one test needs — and
skips any occupation that already has questions, so it is safe to re-run. Learning
material is *not* seeded: PDFs are real files an administrator uploads.

---

## Docker

```bash
cp .env.example .env          # set AUTH_SECRET at minimum
docker compose up --build
```

This starts Postgres 16 and the application, applies migrations on boot and serves on
<http://localhost:3000>. Seed the database once the stack is healthy:

```bash
docker compose exec app npx tsx prisma/seed.ts
```

The image is a multi-stage build producing Next.js `standalone` output, runs as a
non-root user and exposes a health check at `/api/health`.

---

## Deploying to Netlify

`netlify.toml` is committed and the Next.js runtime is auto-installed, so a
deploy is:

```bash
npx netlify login
npx netlify deploy --build --prod
```

Set the same environment variables under *Site configuration → Environment
variables* (or `npx netlify env:set KEY value`).

Prisma's `binaryTargets` in `prisma/schema.prisma` includes the RHEL engines —
serverless functions run on Amazon Linux, and the engine built on the Ubuntu
build image will not load there. Removing those targets breaks the deploy at
runtime, not at build time.

## Deploying to Vercel

1. Push the repository to GitHub and import it at <https://vercel.com/new>.
2. Add every environment variable from the table above under *Settings → Environment
   Variables*. Set `NEXT_PUBLIC_APP_URL` to the production URL.
3. Deploy. The build runs `prisma generate && next build`.
4. Apply migrations once, from your machine, against the production database:

   ```bash
   DATABASE_URL="<prod pooled url>" DIRECT_URL="<prod direct url>" npx prisma migrate deploy
   ```

5. Seed the first administrator the same way:

   ```bash
   DATABASE_URL="..." DIRECT_URL="..." ADMIN_EMAIL="you@inst.in" ADMIN_PASSWORD="…" npm run db:seed
   ```

6. Update the Google OAuth redirect URI to the production domain.

---

## Assessment rules

| Rule | Implementation |
| --- | --- |
| 20 random questions | Drawn per attempt from the occupation's active bank |
| MCQ and True/False | Both types, one mark each |
| No negative marking | Wrong and blank answers score zero |
| 30-minute timer | `expiresAt` is stored on the attempt when it is created |
| Refresh cannot reset the timer | The countdown is derived from the server's `expiresAt` |
| Auto-submit on timeout | Enforced server-side; a closed tab is graded on return |
| Randomised options | A per-attempt permutation is stored with each answer row |
| Review before submitting | A confirmation step lists any unanswered questions |
| Answers final once submitted | Saves are rejected for non-`IN_PROGRESS` attempts |
| 70% to pass | 14 of 20 correct |

One attempt is live at a time: starting a test while one is in progress resumes it
rather than issuing a fresh set of questions.

---

## CSV bulk import format

*Admin → Questions → Import CSV.* The dialog also offers a downloadable template.

```csv
occupation,topic,type,question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty
FITTER,Measurement,MCQ,"What is the least count of a vernier caliper?","0.01 mm","0.02 mm","0.1 mm","1 mm",B,"Standard vernier reads 0.02 mm.",EASY
ELECTRICIAN,Safety,TRUE_FALSE,"Earthing protects against electric shock.",True,False,,,A,"Earth gives fault current a safe path.",EASY
```

- `occupation` — `FITTER`, `ELECTRICIAN`, `SOLAR_TECHNICIAN`, `BASIC_COSMETOLOGY`
  (also accepts `Solar Technician`, `solar`, `cosmetology`, …)
- `type` — `MCQ` (default) or `TRUE_FALSE`
- `correct_answer` — `A`–`D`, or `True`/`False` for True/False rows
- `difficulty` — `EASY` (default), `MEDIUM`, `HARD`
- `option_c` / `option_d` are required for MCQ and ignored for True/False

Invalid rows are skipped and reported with their row number; valid rows still import.

---

## Security notes

- Passwords hashed with bcrypt (12 rounds); sign-in compares against a dummy hash when
  the account does not exist, so response time does not leak account existence.
- Verification and reset tokens are random 32-byte values stored **SHA-256 hashed**;
  resets are single-use and invalidate existing sessions.
- Role-based access enforced in three places: middleware, layout and every Server Action
  or route handler.
- Every input is validated with Zod on the server — client validation is convenience only.
- Prisma's parameterised queries remove SQL-injection risk; React escapes output by
  default, and CSV exports neutralise spreadsheet formula injection.
- CSRF: Server Actions carry Next.js' built-in origin protection; mutating route handlers
  additionally verify the `Origin` header.
- Fixed-window rate limiting on sign-in, sign-up, password reset, verification resend,
  test start, answer saving, uploads and exports.
- Security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) are set for every route in `next.config.ts`.
- Uploads are restricted to `application/pdf` and 25 MB, verified against storage
  metadata before the database row is written.
- Disabled accounts are rejected at sign-in and their JWT is invalidated within 60
  seconds of the change.

> The rate limiter is in-process. On a multi-instance deployment each instance keeps its
> own window; swap the store in `lib/rate-limit.ts` for Redis/Upstash if you need a
> shared one — every call site uses the same signature.

---

## Project structure

```
app/
  (auth)/          login, signup, forgot-password, reset-password, verify-email
  (app)/           dashboard, learn, tests, tests/[testId], tests/result/[testId],
                   progress, profile  — shares the learner shell layout
  admin/           overview, users, pdfs, questions, analytics
  api/             auth/[...nextauth], admin/export/*, admin/pdfs/upload-url, health
  onboarding/      first-run profile creation
actions/           Server Actions (auth, profile, pdf, test, admin/*)
components/
  ui/              shadcn/ui primitives
  auth/ layout/ dashboard/ learn/ tests/ progress/ profile/ admin/
hooks/             use-countdown, use-debounce
lib/
  queries/         learner and admin data access
  validations/     Zod schemas
  auth.ts auth.config.ts prisma.ts supabase.ts storage.ts mail.ts
  test-engine.ts rate-limit.ts exporters.ts utils.ts constants.ts env.ts
middleware/        API route guards (auth, role, CSRF, rate limit)
middleware.ts      route protection at the edge
prisma/            schema.prisma, migrations/, seed.ts
types/             shared types and Auth.js module augmentation
public/            static assets
```

---

## Troubleshooting

**`Can't reach database server`** — check `DATABASE_URL`, and that your IP is allowed in
Supabase. Locally, `docker compose up db` gives you a database in seconds.

**`prisma migrate` hangs or fails on Supabase** — migrations must use `DIRECT_URL`
(port 5432). The pooled connection cannot run DDL.

**Google sign-in returns `redirect_uri_mismatch`** — the redirect URI in Google Cloud
must be exactly `<origin>/api/auth/callback/google`, including the scheme.

**Uploads fail with "Supabase Storage is not configured"** — all three of
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` must be set, and the bucket must exist.

**"This test needs 20 questions but only N are available"** — add questions for that
occupation, or run `npm run db:seed`.

**Verification e-mail never arrives** — with SMTP unset the link is printed to the
server console; search the log for `[mail]`.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:deploy` | Apply migrations |
| `npm run db:migrate` | Create a migration |
| `npm run db:seed` | Seed administrator + questions |
| `npm run db:studio` | Prisma Studio |
| `npm run build:standalone` | Standalone build used by the Docker image |

---

## Licence

Provided for the operator of this portal to use, modify and deploy.
