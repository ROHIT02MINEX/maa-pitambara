"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { recordPdfViewAction, toggleBookmarkAction } from "@/actions/pdf";
import { runAction } from "@/lib/run-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { PdfListItem } from "@/types";

type ViewerState = { id: string; title: string; url: string } | null;

export function PdfLibrary({
  pdfs,
  initialQuery,
  initialTab,
  highlightId,
}: {
  pdfs: PdfListItem[];
  initialQuery: string;
  initialTab: "all" | "bookmarked";
  highlightId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(initialQuery);
  const [viewer, setViewer] = React.useState<ViewerState>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [bookmarks, setBookmarks] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(pdfs.map((pdf) => [pdf.id, pdf.bookmarked])),
  );

  const debouncedQuery = useDebounce(query);

  // Keep local bookmark state in sync when the server sends a new list.
  React.useEffect(() => {
    setBookmarks(Object.fromEntries(pdfs.map((pdf) => [pdf.id, pdf.bookmarked])));
  }, [pdfs]);

  // Push the debounced search term into the URL so results are shareable.
  React.useEffect(() => {
    if (debouncedQuery === initialQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    params.delete("highlight");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "bookmarked") params.set("tab", "bookmarked");
    else params.delete("tab");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleBookmark(pdfId: string) {
    setPending(pdfId);
    const previous = bookmarks[pdfId] ?? false;
    setBookmarks((state) => ({ ...state, [pdfId]: !previous })); // optimistic

    const result = await runAction(() => toggleBookmarkAction(pdfId));
    setPending(null);

    if (!result.ok) {
      setBookmarks((state) => ({ ...state, [pdfId]: previous })); // roll back
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  async function handleOpen(pdf: PdfListItem) {
    setViewer({ id: pdf.id, title: pdf.title, url: pdf.fileUrl });
    const result = await runAction(() => recordPdfViewAction(pdf.id));
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, topic or description…"
            className="pl-9 pr-9"
            aria-label="Search learning material"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <Tabs value={initialTab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All documents</TabsTrigger>
            <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {pdfs.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No documents found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialQuery
              ? "Try a different search term."
              : initialTab === "bookmarked"
                ? "You haven't bookmarked anything yet."
                : "Nothing has been published for your trade yet."}
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pdfs.map((pdf) => {
            const bookmarked = bookmarks[pdf.id] ?? false;
            return (
              <li key={pdf.id}>
                <Card
                  className={cn(
                    "flex h-full flex-col p-5 transition-shadow hover:shadow-md",
                    highlightId === pdf.id && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-snug">{pdf.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(pdf.fileSize)} · {formatDate(pdf.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending === pdf.id}
                      onClick={() => handleBookmark(pdf.id)}
                      aria-pressed={bookmarked}
                      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      {bookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {pdf.description ? (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                      {pdf.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {pdf.topic ? <Badge variant="secondary">{pdf.topic}</Badge> : null}
                    {pdf.viewed ? (
                      <Badge variant="success">
                        <Eye className="h-3 w-3" /> Viewed
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" onClick={() => handleOpen(pdf)}>
                      Read
                    </Button>
                    <Button asChild variant="outline" size="icon" title="Download">
                      <a href={pdf.fileUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download {pdf.title}</span>
                      </a>
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(viewer)} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{viewer?.title}</DialogTitle>
            <DialogDescription>
              Reading in the browser. Use the buttons below to download or open in a new tab.
            </DialogDescription>
          </DialogHeader>

          {viewer ? (
            <>
              <iframe
                src={viewer.url}
                title={viewer.title}
                className="h-[65vh] w-full rounded-lg border bg-muted"
              />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={viewer.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open in new tab
                  </a>
                </Button>
                <Button asChild>
                  <a href={viewer.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
