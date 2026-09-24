"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import { RetestStatus } from "@prisma/client";
import { Clock, RotateCcw, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "@/lib/toast";

import { requestRetestAction } from "@/actions/retest";
import { runAction } from "@/lib/run-action";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type RetestRequestRow = {
  id: string;
  status: RetestStatus;
  reason: string | null;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  consumedAt: Date | null;
};

const STATUS_META: Record<
  RetestStatus,
  { label: string; variant: "warning" | "success" | "destructive"; icon: typeof Clock }
> = {
  PENDING: { label: "Awaiting review", variant: "warning", icon: Clock },
  APPROVED: { label: "Approved", variant: "success", icon: ThumbsUp },
  REJECTED: { label: "Rejected", variant: "destructive", icon: ThumbsDown },
};

export function RetestPanel({
  canRequest,
  blockedMessage,
  requests,
  attemptsUsed,
  freeAttempts,
}: {
  /** False when the learner can already start a test, or already has one pending. */
  canRequest: boolean;
  blockedMessage: string | null;
  requests: RetestRequestRow[];
  attemptsUsed: number;
  freeAttempts: number;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await runAction(() => requestRetestAction({ reason }));
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Request sent.");
    setReason("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" aria-hidden /><T>{" Retest requests "}</T></CardTitle>
        <CardDescription><T>{" Every learner gets "}</T><T>{freeAttempts}</T><T>{" attempt"}</T><T>{freeAttempts === 1 ? "" : "s"}</T><T>{". You have used"}</T><T>{" "}</T>
          <T>{attemptsUsed}</T><T>{". Further attempts need approval from the institute. "}</T></CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {blockedMessage ? (
          <Alert variant={canRequest ? "warning" : "info"}>
            <AlertDescription><T>{blockedMessage}</T></AlertDescription>
          </Alert>
        ) : null}

        {canRequest ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="retest-reason"><T>{"Why do you need another attempt? (optional)"}</T></Label>
              <Textarea
                id="retest-reason"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: my internet dropped during the test, or I want to improve my score after revising."
              />
              <p className="text-xs text-muted-foreground"><T>{reason.length}</T><T>{"/500"}</T></p>
            </div>
            <Button type="submit" loading={busy}>
              <Send className="h-4 w-4" /><T>{" Send request "}</T></Button>
          </form>
        ) : null}

        {requests.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold"><T>{"Your requests"}</T></h3>
            <ul className="divide-y">
              {requests.map((request) => {
                const meta = STATUS_META[request.status];
                const Icon = meta.icon;
                return (
                  <li key={request.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>
                          <Icon className="h-3 w-3" /> <T>{meta.label}</T>
                        </Badge>
                        {request.status === "APPROVED" ? (
                          <Badge variant="outline">
                            <T>{request.consumedAt ? "Used" : "Ready to use"}</T>
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          <T>{formatDate(request.createdAt, true)}</T>
                        </span>
                      </span>
                      {request.reason ? (
                        <span className="mt-1 block text-sm text-muted-foreground"><T>{" “"}</T><T>{request.reason}</T><T>{"” "}</T></span>
                      ) : null}
                      {request.adminNote ? (
                        <span className="mt-1 block text-sm">
                          <strong className="font-medium"><T>{"Institute's note: "}</T></strong>
                          <T>{request.adminNote}</T>
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
