"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import { Occupation } from "@prisma/client";
import {
  Download,
  ExternalLink,
  FileUp,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { createPdfAction, deletePdfAction, updatePdfAction } from "@/actions/admin/pdfs";
import { runAction } from "@/lib/run-action";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ALLOWED_PDF_MIME, MAX_PDF_BYTES, OCCUPATIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminPdfRow = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  occupation: Occupation;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
  /** Official NIMI banks shipped with the portal — managed by the importer. */
  builtIn: boolean;
  uploadedBy: { name: string | null; email: string } | null;
  _count: { views: number; bookmarks: number; questions: number };
};

type FormState = {
  title: string;
  description: string;
  topic: string;
  occupation: Occupation;
  file: File | null;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  topic: "",
  occupation: Occupation.FITTER,
  file: null,
};

export function PdfManager({
  pdfs,
  storageReady,
}: {
  pdfs: AdminPdfRow[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<AdminPdfRow | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(pdf: AdminPdfRow) {
    setForm({
      title: pdf.title,
      description: pdf.description ?? "",
      topic: pdf.topic ?? "",
      occupation: pdf.occupation,
      file: null,
    });
    setEditingId(pdf.id);
    setError(null);
    setDialogOpen(true);
  }

  /** Uploads the chosen file straight to Supabase Storage via a signed URL. */
  async function uploadFile(file: File): Promise<string> {
    setUploadPct(10);

    const response = await fetch("/api/admin/pdfs/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        occupation: form.occupation,
        size: file.size,
        contentType: file.type || ALLOWED_PDF_MIME,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not start the upload.");
    }

    const { path, token, bucket } = (await response.json()) as {
      path: string;
      token: string;
      bucket: string;
    };

    setUploadPct(45);
    const { error: uploadError } = await supabaseBrowser()
      .storage.from(bucket)
      .uploadToSignedUrl(path, token, file, { contentType: ALLOWED_PDF_MIME });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    setUploadPct(85);
    return path;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!editingId && !form.file) {
      setError("Choose a PDF file to upload.");
      return;
    }
    if (form.file) {
      if (form.file.type !== ALLOWED_PDF_MIME) {
        setError("Only PDF files can be uploaded.");
        return;
      }
      if (form.file.size > MAX_PDF_BYTES) {
        setError(`That file is ${formatBytes(form.file.size)}. The limit is 25 MB.`);
        return;
      }
    }

    setBusy(true);
    try {
      const storagePath = form.file ? await uploadFile(form.file) : undefined;

      const payload = {
        title: form.title,
        description: form.description,
        topic: form.topic,
        occupation: form.occupation,
        ...(storagePath ? { storagePath } : {}),
      };

      const result = editingId
        ? await updatePdfAction({ ...payload, id: editingId })
        : await createPdfAction({ ...payload, storagePath: storagePath! });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(result.message ?? "Saved.");
      setDialogOpen(false);
      setForm(EMPTY);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await runAction(() => deletePdfAction(deleting.id));
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Deleted.");
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={!storageReady}>
          <Plus className="h-4 w-4" /><T>{" Upload PDF "}</T></Button>
      </div>

      {!storageReady ? (
        <Alert variant="warning">
          <AlertDescription><T>{" Supabase Storage is not configured, so uploading is disabled. Set"}</T><T>{" "}</T>
            <code><T>{"NEXT_PUBLIC_SUPABASE_URL"}</T></code><T>{", "}</T><code><T>{"NEXT_PUBLIC_SUPABASE_ANON_KEY"}</T></code><T>{" and"}</T><T>{" "}</T>
            <code><T>{"SUPABASE_SERVICE_ROLE_KEY"}</T></code><T>{", then create the storage bucket described in the README. "}</T></AlertDescription>
        </Alert>
      ) : null}

      {pdfs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"><T>{" No documents match these filters. "}</T></p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><T>{"Title"}</T></TableHead>
              <TableHead><T>{"Occupation"}</T></TableHead>
              <TableHead><T>{"Topic"}</T></TableHead>
              <TableHead><T>{"Size"}</T></TableHead>
              <TableHead><T>{"Engagement"}</T></TableHead>
              <TableHead><T>{"Uploaded"}</T></TableHead>
              <TableHead className="text-right"><T>{"Actions"}</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pdfs.map((pdf) => (
              <TableRow key={pdf.id}>
                <TableCell className="max-w-[280px]">
                  <p className="truncate font-medium"><T>{pdf.title}</T></p>
                  {pdf.description ? (
                    <p className="truncate text-xs text-muted-foreground"><T>{pdf.description}</T></p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {pdf.builtIn ? (
                      <Badge variant="outline" className="text-[11px]"><T>{" Official, read only "}</T></Badge>
                    ) : null}
                    {pdf._count.questions > 0 ? (
                      <Badge variant="outline" className="text-[11px]">
                        <T>{pdf._count.questions}</T><T>{" question(s) "}</T></Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary"><T>{OCCUPATION_LABELS[pdf.occupation]}</T></Badge>
                </TableCell>
                <TableCell className="text-sm"><T>{pdf.topic ?? "-"}</T></TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  <T>{formatBytes(pdf.fileSize)}</T>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <T>{pdf._count.views}</T><T>{" view(s) "}</T><br />
                  <T>{pdf._count.bookmarks}</T><T>{" bookmark(s) "}</T></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <T>{formatDate(pdf.createdAt)}</T>
                  <br />
                  <T>{pdf.uploadedBy?.name ?? pdf.uploadedBy?.email ?? "-"}</T>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${pdf.title}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={pdf.fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink /><T>{" Open "}</T></a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={pdf.fileUrl} download target="_blank" rel="noopener noreferrer">
                          <Download /><T>{" Download "}</T></a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Built-in banks are owned by `npm run db:import-material`;
                          the server rejects edits to them, so the UI does not
                          offer an action that can only fail. */}
                      <DropdownMenuItem disabled={pdf.builtIn} onSelect={() => openEdit(pdf)}>
                        <Pencil /><T>{" Edit / replace file "}</T></DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={pdf.builtIn}
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleting(pdf)}
                      >
                        <Trash2 /><T>{" Delete "}</T></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !busy && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><T>{editingId ? "Edit document" : "Upload a document"}</T></DialogTitle>
            <DialogDescription>
              <T>{editingId
                ? "Update the details, and optionally replace the file itself."
                : "The PDF is uploaded straight to storage; only its metadata passes through the server."}</T>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription><T>{error}</T></AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pdf-title"><T>{"Title"}</T></Label>
              <Input
                id="pdf-title"
                required
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                placeholder="Safety practices, module 1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pdf-occupation"><T>{"Occupation"}</T></Label>
                <Select
                  value={form.occupation}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, occupation: value as Occupation }))
                  }
                >
                  <SelectTrigger id="pdf-occupation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPATIONS.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>
                        <T>{OCCUPATION_LABELS[occupation]}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf-topic"><T>{"Topic (optional)"}</T></Label>
                <Input
                  id="pdf-topic"
                  value={form.topic}
                  onChange={(event) => setForm((f) => ({ ...f, topic: event.target.value }))}
                  placeholder="Safety"
                />
                <p className="text-xs text-muted-foreground"><T>{" Matching the topic used on questions powers the “recommended reading” after a test. "}</T></p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-description"><T>{"Description (optional)"}</T></Label>
              <Textarea
                id="pdf-description"
                value={form.description}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                placeholder="What this document covers…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-file">
                <T>{editingId ? "Replace file (optional)" : "PDF file"}</T>
              </Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf"
                required={!editingId}
                onChange={(event) =>
                  setForm((f) => ({ ...f, file: event.target.files?.[0] ?? null }))
                }
              />
              <p className="text-xs text-muted-foreground"><T>{"PDF only, up to 25 MB."}</T></p>
              {form.file ? (
                <p className="flex items-center gap-1.5 text-xs">
                  <FileUp className="h-3 w-3" aria-hidden /> <T>{form.file.name}</T><T>{" ( "}</T><T>{formatBytes(form.file.size)}</T><T>{") "}</T></p>
              ) : null}
            </div>

            {uploadPct !== null ? (
              <div className="space-y-1.5">
                <Progress value={uploadPct} aria-label="Upload progress" />
                <p className="text-xs text-muted-foreground"><T>{"Uploading…"}</T></p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
              ><T>{" Cancel "}</T></Button>
              <Button type="submit" loading={busy}>
                {editingId ? (
                  <>
                    <RefreshCw className="h-4 w-4" /><T>{" Save changes "}</T></>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" /><T>{" Publish document "}</T></>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><T>{"Delete this document?"}</T></AlertDialogTitle>
            <AlertDialogDescription><T>{" “"}</T><T>{deleting?.title}</T><T>{"” will be removed from the portal and deleted from storage, along with its bookmarks and view history. This cannot be undone. "}</T></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><T>{"Cancel"}</T></AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              <T>{busy ? "Deleting…" : "Delete"}</T>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
