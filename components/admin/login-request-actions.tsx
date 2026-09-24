"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "@/lib/toast";

import {
  approveLoginRequestAction,
  rejectLoginRequestAction,
} from "@/actions/admin/login-requests";
import { runAction } from "@/lib/run-action";
import { Button } from "@/components/ui/button";

export function LoginRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null);

  async function review(decision: "approve" | "reject") {
    setBusy(decision);
    const result = await runAction(() =>
      decision === "approve" ? approveLoginRequestAction(id) : rejectLoginRequestAction(id),
    );
    setBusy(null);
    if (!result.ok) return toast.error(result.error);
    toast.success(result.message ?? "Request updated.");
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" onClick={() => review("approve")} loading={busy === "approve"}>
        <Check className="h-4 w-4" /><T>{" Approve "}</T></Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => review("reject")}
        loading={busy === "reject"}
      >
        <X className="h-4 w-4" /><T>{" Reject "}</T></Button>
    </div>
  );
}
