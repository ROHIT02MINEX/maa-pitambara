import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const migration = "20260829090000_login_approval_and_admin_presence";

async function main() {
  const history = await prisma.$queryRaw<Array<{ name: string | null }>>`
    SELECT to_regclass('public._prisma_migrations')::text AS name
  `;
  if (!history[0]?.name) return;

  const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migration}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
  `;
  if (rows.length === 0) return;

  await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "LoginRequestStatus"');
  await prisma.$disconnect();
  execFileSync("npx", ["prisma", "migrate", "resolve", "--rolled-back", migration], {
    stdio: "inherit",
  });
  console.log("Recovered the incomplete login-approval migration safely.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
