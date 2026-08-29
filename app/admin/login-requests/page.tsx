import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { listLoginRequests } from "@/lib/login-approval";
import { formatDate } from "@/lib/utils";
import { LoginRequestActions } from "@/components/admin/login-request-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Login requests" };
export const dynamic = "force-dynamic";

export default async function LoginRequestsPage() {
  await requireAdmin();
  const requests = await listLoginRequests();

  const pending = requests.filter((request) => request.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Login requests</h1>
        <p className="mt-1 text-muted-foreground">
          Approve a learner for one login. An approval expires after 15 minutes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
          <CardDescription>{pending} request(s) waiting for review.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No login requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed by</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium">{request.user.name ?? "Unnamed learner"}</p>
                      <p className="text-xs text-muted-foreground">{request.user.email}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === "APPROVED"
                            ? "success"
                            : request.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {request.consumedAt ? "USED" : request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.reviewedBy?.name ?? request.reviewedBy?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "PENDING" ? (
                        <LoginRequestActions id={request.id} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Reviewed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
