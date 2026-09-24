"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import type { Occupation, RetestStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import { toast } from "@/lib/toast";

import { reviewRetestAction } from "@/actions/retest";
import { runAction } from "@/lib/run-action";
import { occupationLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminRetestRow = {
  id: string;
  status: RetestStatus;
  reason: string | null;
  adminNote: string | null;
  occupation: Occupation;
  createdAt: Date;
  reviewedAt: Date | null;
  consumedAt: Date | null;
  user: { name: string | null; email: string; phone: string | null };
  reviewedBy: { name: string | null; email: string } | null;
  attemptsUsed: number;
};

export function RetestTable({ rows }: { rows: AdminRetestRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  async function review(id: string, approve: boolean) {
    setBusyId(id);
    const result = await runAction(() =>
      reviewRetestAction({ id, approve, adminNote: notes[id] ?? "" }),
    );
    setBusyId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"><T>{" No retest requests match these filters. "}</T></p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><T>{"Learner"}</T></TableHead>
          <TableHead><T>{"Occupation"}</T></TableHead>
          <TableHead><T>{"Attempts"}</T></TableHead>
          <TableHead className="w-[26%]"><T>{"Reason"}</T></TableHead>
          <TableHead><T>{"Requested"}</T></TableHead>
          <TableHead><T>{"Status"}</T></TableHead>
          <TableHead className="text-right"><T>{"Decision"}</T></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-[200px]">
              <p className="truncate font-medium"><T>{row.user.name ?? "Unnamed"}</T></p>
              <p className="truncate text-xs text-muted-foreground"><T>{row.user.email}</T></p>
              {row.user.phone ? (
                <p className="truncate text-xs text-muted-foreground"><T>{row.user.phone}</T></p>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="secondary"><T>{occupationLabel(row.occupation)}</T></Badge>
            </TableCell>
            <TableCell className="tabular-nums"><T>{row.attemptsUsed}</T></TableCell>
            <TableCell className="max-w-[280px]">
              {row.reason ? (
                <p className="line-clamp-3 text-sm"><T>{row.reason}</T></p>
              ) : (
                <span className="text-sm text-muted-foreground"><T>{"-"}</T></span>
              )}
              {row.adminNote ? (
                <p className="mt-1 text-xs text-muted-foreground"><T>{"Note: "}</T><T>{row.adminNote}</T></p>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              <T>{formatDate(row.createdAt, true)}</T>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  row.status === "APPROVED"
                    ? "success"
                    : row.status === "REJECTED"
                      ? "destructive"
                      : "warning"
                }
              >
                <T>{row.status === "APPROVED"
                  ? "Approved"
                  : row.status === "REJECTED"
                    ? "Rejected"
                    : "Pending"}</T>
              </Badge>
              {row.status === "APPROVED" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>{row.consumedAt ? "Used" : "Not used yet"}</T>
                </p>
              ) : null}
              {row.reviewedBy ? (
                <p className="mt-1 text-xs text-muted-foreground"><T>{" by "}</T><T>{row.reviewedBy.name ?? row.reviewedBy.email}</T>
                </p>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              {row.status === "PENDING" ? (
                <div className="flex flex-col items-end gap-2">
                  <Input
                    aria-label={`Note for ${row.user.email}`}
                    placeholder="Note (optional)"
                    className="h-8 w-[180px]"
                    value={notes[row.id] ?? ""}
                    onChange={(event) =>
                      setNotes((state) => ({ ...state, [row.id]: event.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      loading={busyId === row.id}
                      onClick={() => review(row.id, true)}
                    >
                      <Check className="h-4 w-4" /><T>{" Approve "}</T></Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, false)}
                    >
                      <X className="h-4 w-4" /><T>{" Reject "}</T></Button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  <T>{row.reviewedAt ? formatDate(row.reviewedAt, true) : "-"}</T>
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
