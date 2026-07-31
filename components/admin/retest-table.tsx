"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Occupation, RetestStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

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
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No retest requests match these filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Learner</TableHead>
          <TableHead>Occupation</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead className="w-[26%]">Reason</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Decision</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-[200px]">
              <p className="truncate font-medium">{row.user.name ?? "Unnamed"}</p>
              <p className="truncate text-xs text-muted-foreground">{row.user.email}</p>
              {row.user.phone ? (
                <p className="truncate text-xs text-muted-foreground">{row.user.phone}</p>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{occupationLabel(row.occupation)}</Badge>
            </TableCell>
            <TableCell className="tabular-nums">{row.attemptsUsed}</TableCell>
            <TableCell className="max-w-[280px]">
              {row.reason ? (
                <p className="line-clamp-3 text-sm">{row.reason}</p>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
              {row.adminNote ? (
                <p className="mt-1 text-xs text-muted-foreground">Note: {row.adminNote}</p>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDate(row.createdAt, true)}
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
                {row.status === "APPROVED"
                  ? "Approved"
                  : row.status === "REJECTED"
                    ? "Rejected"
                    : "Pending"}
              </Badge>
              {row.status === "APPROVED" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.consumedAt ? "Used" : "Not used yet"}
                </p>
              ) : null}
              {row.reviewedBy ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  by {row.reviewedBy.name ?? row.reviewedBy.email}
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
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, false)}
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {row.reviewedAt ? formatDate(row.reviewedAt, true) : "—"}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
