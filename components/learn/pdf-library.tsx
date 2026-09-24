"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useLanguage } from "@/hooks/use-language";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";

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
import { SUBJECT_SHORT_LABELS } from "@/lib/constants";
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
  const { language } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(initialQuery);
  const [viewer, setViewer] = React.useState<ViewerState>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [bookmarks, setBookmarks] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(pdfs.map((pdf) => [pdf.id, pdf.bookmarked])),
  );

  const debouncedQuery = useDebounce(query);
  const highlightRef = React.useRef<HTMLLIElement | null>(null);

  // Keep local bookmark state in sync when the server sends a new list.
  React.useEffect(() => {
    setBookmarks(Object.fromEntries(pdfs.map((pdf) => [pdf.id, pdf.bookmarked])));
  }, [pdfs]);

  // Arriving from a result page's "find in library" link: bring the document
  // into view rather than leaving the learner to hunt for the ring.
  React.useEffect(() => {
    if (!highlightId) return;
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId]);

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
    setViewer({ id: pdf.id, title: language === "hi" ? pdf.titleHi || pdf.title : pdf.title, url: pdf.fileUrl });
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
            <TabsTrigger value="all"><T>{"All documents"}</T></TabsTrigger>
            <TabsTrigger value="bookmarked"><T>{"Bookmarked"}</T></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {pdfs.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-medium"><T>{"No documents found"}</T></p>
          <p className="mt-1 text-sm text-muted-foreground">
            <T>{initialQuery
              ? "Try a different search term."
              : initialTab === "bookmarked"
                ? "You haven't bookmarked anything yet."
                : "Nothing has been published for your trade yet."}</T>
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pdfs.map((pdf) => {
            const bookmarked = bookmarks[pdf.id] ?? false;
            const highlighted = highlightId === pdf.id;
            return (
              <li key={pdf.id} ref={highlighted ? highlightRef : undefined}>
                <Card
                  className={cn(
                    "flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-md",
                    highlighted && "ring-2 ring-primary",
                  )}
                >
                  {/* Gold spine, echoing the seal's inner ring. */}
                  <div className="gold-rule" aria-hidden />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold">
                        <FileText className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-snug"><T>{language === "hi" ? pdf.titleHi || pdf.title : pdf.title}</T></h3>
                        {pdf.titleHi && language === "en" ? (
                          <p lang="hi" className="font-devanagari text-xs text-muted-foreground">
                            <T>{pdf.titleHi}</T>
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          <T>{formatBytes(pdf.fileSize)}</T><T>{" · "}</T><T>{formatDate(pdf.createdAt)}</T>
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
                          <BookmarkCheck className="h-4 w-4 text-primary dark:text-gold" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {pdf.description ? (
                      <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                        <T>{pdf.description}</T>
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {pdf.builtIn ? (
                        <Badge variant="secondary">
                          <ShieldCheck className="h-3 w-3" /><T>{" Official "}</T></Badge>
                      ) : null}
                      {pdf.subject ? (
                        <Badge variant="outline"><T>{SUBJECT_SHORT_LABELS[pdf.subject]}</T></Badge>
                      ) : null}
                      {pdf.year ?? pdf.topic ? (
                        <Badge variant="outline"><T>{pdf.year ?? pdf.topic}</T></Badge>
                      ) : null}
                      {pdf.questionCount > 0 ? (
                        <Badge variant="outline" title="Test questions drawn from this document">
                          <HelpCircle className="h-3 w-3" /> <T>{pdf.questionCount}</T><T>{" in tests "}</T></Badge>
                      ) : null}
                      {pdf.viewed ? (
                        <Badge variant="success">
                          <Eye className="h-3 w-3" /><T>{" Viewed "}</T></Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button className="flex-1" onClick={() => handleOpen(pdf)}><T>{" Read "}</T></Button>
                      <Button asChild variant="outline" size="icon" title="Download">
                        <a href={pdf.fileUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          <span className="sr-only"><T>{"Download "}</T><T>{pdf.title}</T></span>
                        </a>
                      </Button>
                    </div>
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
            <DialogTitle className="pr-8"><T>{viewer?.title}</T></DialogTitle>
            <DialogDescription><T>{" Reading in the browser. Use the buttons below to download or open in a new tab. "}</T></DialogDescription>
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
                    <ExternalLink className="h-4 w-4" /><T>{" Open in new tab "}</T></a>
                </Button>
                <Button asChild>
                  <a href={viewer.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /><T>{" Download "}</T></a>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
