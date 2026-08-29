import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { envStatus } from "@/lib/env";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Skill Learning & Assessment Portal.",
};

export default async function LoginPage({
  searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string; error?: string; approval?: string }>;
}) {
  const params = await searchParams;

  // Only allow relative callbacks so the parameter cannot be used as an open redirect.
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : undefined;

  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <LoginForm
        callbackUrl={callbackUrl}
        googleEnabled={envStatus().google}
        initiallyPending={params.approval === "pending"}
      />
    </Suspense>
  );
}
