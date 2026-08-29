import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ONLINE_WINDOW_MS = 90 * 1000;

export async function GET() {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const online = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      disabled: false,
      lastLoginAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) },
    },
  });

  return NextResponse.json({ online: online > 0, count: online });
}

export async function POST() {
  const user = await currentUser();
  if (!user?.id || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return NextResponse.json({ online: true });
}
