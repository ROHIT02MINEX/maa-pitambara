"use client";

import * as React from "react";
import { RefreshCw, Sheet } from "lucide-react";
import { toast } from "sonner";

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
          <Sheet className="h-5 w-5 text-primary" aria-hidden /> Google Sheets backup
        </CardTitle>
        <CardDescription>
          Every submitted test is copied to your spreadsheet automatically. Use this to
          re-send everything. Rows already present are skipped, so it is safe to re-run.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured ? (
          <Button onClick={sync} loading={busy}>
            <RefreshCw className="h-4 w-4" /> Sync all results now
          </Button>
        ) : (
          <Alert variant="warning">
            <AlertDescription>
              Not configured yet. Deploy <code>google-apps-script/sheets-backup.gs</code> as a
              Google Apps Script Web App, then set <code>GOOGLE_SHEETS_WEBHOOK_URL</code> and{" "}
              <code>GOOGLE_SHEETS_SHARED_SECRET</code>. Setup steps are in the top of that file.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
