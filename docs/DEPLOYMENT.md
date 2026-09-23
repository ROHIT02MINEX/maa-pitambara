# Production deployment

- Repository: https://github.com/ROHIT02MINEX/maa-pitambara
- Vercel project: `maa-pitambara`, team `rohit-s-projects-f4a94946`
- Production URL: https://maa-pitambara-rohit-s-projects-f4a94946.vercel.app
- Supabase project: `obbxnjqsjkrddgtakiye` (Mumbai)
- Runtime: Node.js 22

Vercel builds run `npm run vercel-build`. The recovery script handles a new
database without a migration history table. Committed migrations include the
retest schema and protect server-only tables from Supabase Data API access.
Auth.js continues to authorize application requests; Prisma connects as the
dedicated `skill_app` database role. Anonymous/authenticated Supabase roles have
no table privileges or RLS policies.

Production secrets are configured in Vercel and ignored local environment files.
Never commit them. `DATABASE_URL` uses the transaction pooler on port 6543;
`DIRECT_URL` uses the session pooler on 5432. Both use the project's Mumbai
`aws-0-ap-south-1.pooler.supabase.com` endpoint.

Initial content is loaded with `prisma/seed.ts` and
`prisma/import-material.ts`; rerunning the seed adds only missing starter
questions, including when imported questions already exist for a trade.
Run these scripts with environment variables loaded (for example,
`node --env-file=.env --import tsx prisma/seed.ts`).

Optional services require valid credentials: Supabase PDF uploads need the
server-only storage key; Google login needs an OAuth client; email delivery and
password-reset email need SMTP. Bundled PDF files are served by Vercel.
