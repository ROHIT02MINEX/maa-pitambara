import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTest } from "@/lib/queries/learner";
import { finalizeTest } from "@/lib/test-engine";
import { TestRunner } from "@/components/tests/test-runner";

export const metadata: Metadata = {
  title: "Test in progress",
  robots: { index: false, follow: false },
};

export default async function TestAttemptPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const user = await currentUser();
  if (!user?.id) redirect("/login");

  const test = await prisma.test.findFirst({
    where: { id: testId, userId: user.id },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!test) redirect("/tests");
  if (test.status !== "IN_PROGRESS") redirect(`/tests/result/${testId}`);

  // Landing here after the deadline grades the attempt as it stands.
  if (test.expiresAt < new Date()) {
    await finalizeTest(testId, true);
    redirect(`/tests/result/${testId}`);
  }

  const active = await getActiveTest(testId, user.id);
  if (!active) redirect(`/tests/result/${testId}`);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Assessment in progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers save as you go. Refreshing the page will not give you more time.
        </p>
      </header>

      <TestRunner test={active} />
    </div>
  );
}
