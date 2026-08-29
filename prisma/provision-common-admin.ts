import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.COMMON_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.COMMON_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Common admin provisioning skipped: environment variables are not configured.");
    return;
  }
  if (password.length < 12) throw new Error("COMMON_ADMIN_PASSWORD must contain at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Common Administrator",
      role: Role.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
    update: {
      role: Role.ADMIN,
      passwordHash,
      disabled: false,
      emailVerified: new Date(),
    },
  });
  console.log("Common administrator account is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
