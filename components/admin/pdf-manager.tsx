"use client";

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
import { toast } from "sonner";

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
          <Plus className="h-4 w-4" /> Upload PDF
        </Button>
      </div>

      {!storageReady ? (
        <Alert variant="warning">
          <AlertDescription>
            Supabase Storage is not configured, so uploading is disabled. Set{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>, then create the storage bucket described in the
            README.
          </AlertDescription>
        </Alert>
      ) : null}

      {pdfs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No documents match these filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pdfs.map((pdf) => (
              <TableRow key={pdf.id}>
                <TableCell className="max-w-[280px]">
                  <p className="truncate font-medium">{pdf.title}</p>
                  {pdf.description ? (
                    <p className="truncate text-xs text-muted-foreground">{pdf.description}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {pdf.builtIn ? (
                      <Badge variant="outline" className="text-[11px]">
                        Official, read only
                      </Badge>
                    ) : null}
                    {pdf._count.questions > 0 ? (
                      <Badge variant="outline" className="text-[11px]">
                        {pdf._count.questions} question(s)
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{OCCUPATION_LABELS[pdf.occupation]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{pdf.topic ?? "-"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatBytes(pdf.fileSize)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {pdf._count.views} view(s)
                  <br />
                  {pdf._count.bookmarks} bookmark(s)
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(pdf.createdAt)}
                  <br />
                  {pdf.uploadedBy?.name ?? pdf.uploadedBy?.email ?? "-"}
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
                          <ExternalLink /> Open
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={pdf.fileUrl} download target="_blank" rel="noopener noreferrer">
                          <Download /> Download
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Built-in banks are owned by `npm run db:import-material`;
                          the server rejects edits to them, so the UI does not
                          offer an action that can only fail. */}
                      <DropdownMenuItem disabled={pdf.builtIn} onSelect={() => openEdit(pdf)}>
                        <Pencil /> Edit / replace file
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={pdf.builtIn}
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleting(pdf)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
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
            <DialogTitle>{editingId ? "Edit document" : "Upload a document"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details, and optionally replace the file itself."
                : "The PDF is uploaded straight to storage; only its metadata passes through the server."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pdf-title">Title</Label>
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
                <Label htmlFor="pdf-occupation">Occupation</Label>
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
                        {OCCUPATION_LABELS[occupation]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf-topic">Topic (optional)</Label>
                <Input
                  id="pdf-topic"
                  value={form.topic}
                  onChange={(event) => setForm((f) => ({ ...f, topic: event.target.value }))}
                  placeholder="Safety"
                />
                <p className="text-xs text-muted-foreground">
                  Matching the topic used on questions powers the &ldquo;recommended
                  reading&rdquo; after a test.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-description">Description (optional)</Label>
              <Textarea
                id="pdf-description"
                value={form.description}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                placeholder="What this document covers…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-file">
                {editingId ? "Replace file (optional)" : "PDF file"}
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
              <p className="text-xs text-muted-foreground">PDF only, up to 25 MB.</p>
              {form.file ? (
                <p className="flex items-center gap-1.5 text-xs">
                  <FileUp className="h-3 w-3" aria-hidden /> {form.file.name} (
                  {formatBytes(form.file.size)})
                </p>
              ) : null}
            </div>

            {uploadPct !== null ? (
              <div className="space-y-1.5">
                <Progress value={uploadPct} aria-label="Upload progress" />
                <p className="text-xs text-muted-foreground">Uploading…</p>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                {editingId ? (
                  <>
                    <RefreshCw className="h-4 w-4" /> Save changes
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" /> Publish document
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.title}&rdquo; will be removed from the portal and deleted from
              storage, along with its bookmarks and view history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
