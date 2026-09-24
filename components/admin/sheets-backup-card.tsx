"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { RefreshCw, Sheet } from "lucide-react";
import { toast } from "@/lib/toast";

import { syncSheetsBackupAction } from "@/actions/admin/backup";
import { runAction } from "@/lib/run-action";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SheetsBackupCard({ configured }: { configured: boolean }) {
  const [busy, setBusy] = React.useState(false);

  async function sync() {
    setBusy(true);
    const result = await runAction(() => syncSheetsBackupAction());
    setBusy(false);

    if (!result.ok) toast.error(result.error);
    else toast.success(result.message ?? "Synced.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sheet className="h-5 w-5 text-primary" aria-hidden /><T>{" Google Sheets backup "}</T></CardTitle>
        <CardDescription><T>{" Every submitted test is copied to your spreadsheet automatically. Use this to re-send everything. Rows already present are skipped, so it is safe to re-run. "}</T></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured ? (
          <Button onClick={sync} loading={busy}>
            <RefreshCw className="h-4 w-4" /><T>{" Sync all results now "}</T></Button>
        ) : (
          <Alert variant="warning">
            <AlertDescription><T>{" Not configured yet. Deploy "}</T><code><T>{"google-apps-script/sheets-backup.gs"}</T></code><T>{" as a Google Apps Script Web App, then set "}</T><code><T>{"GOOGLE_SHEETS_WEBHOOK_URL"}</T></code><T>{" and"}</T><T>{" "}</T>
              <code><T>{"GOOGLE_SHEETS_SHARED_SECRET"}</T></code><T>{". Setup steps are in the top of that file. "}</T></AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
