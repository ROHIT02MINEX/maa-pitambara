import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Full Users in DB:", JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    occupation: u.occupation,
    role: u.role,
    disabled: u.disabled,
    emailVerified: u.emailVerified,
    hasPasswordHash: Boolean(u.passwordHash),
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
