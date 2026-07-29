"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Occupation } from "@prisma/client";
import { FileQuestion, FileText, Loader2, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { occupationLabel } from "@/lib/constants";

type Results = {
  users: { id: string; name: string | null; email: string; occupation: Occupation | null }[];
  pdfs: { id: string; title: string; occupation: Occupation; topic: string | null }[];
  questions: { id: string; question: string; occupation: Occupation; topic: string }[];
};

const EMPTY: Results = { users: [], pdfs: [], questions: [] };

/**
 * Admin-wide search palette (⌘K / Ctrl+K). Each hit navigates to the relevant
 * management page pre-filtered by the search term.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Results>(EMPTY);
  const [loading, setLoading] = React.useState(false);

  const debounced = useDebounce(query, 300);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults(EMPTY);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/admin/search?q=${encodeURIComponent(debounced.trim())}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : EMPTY))
      .then((data: Results) => setResults(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const total = results.users.length + results.pdfs.length + results.questions.length;
  const term = encodeURIComponent(query.trim());

  return (
    <>
      <Button
        variant="outline"
        className="hidden w-56 justify-start text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Search…
        <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Global search</DialogTitle>
            <DialogDescription>
              Search users, documents and questions across the whole portal.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, e-mail, phone, document title, question text…"
              className="pl-9"
              aria-label="Global search"
            />
            {loading ? (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>

          <div className="max-h-[50vh] space-y-5 overflow-y-auto" aria-live="polite">
            {query.trim().length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Type at least two characters to search.
              </p>
            ) : total === 0 && !loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing found for “{query}”.
              </p>
            ) : null}

            {results.users.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden /> Users
                </h3>
                <ul className="space-y-1">
                  {results.users.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => go(`/admin/users?q=${term}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {user.name ?? "Unnamed"}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                        <Badge variant="secondary">{occupationLabel(user.occupation)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {results.pdfs.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Documents
                </h3>
                <ul className="space-y-1">
                  {results.pdfs.map((pdf) => (
                    <li key={pdf.id}>
                      <button
                        type="button"
                        onClick={() => go(`/admin/pdfs?q=${term}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{pdf.title}</span>
                        <Badge variant="secondary">{occupationLabel(pdf.occupation)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {results.questions.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileQuestion className="h-3.5 w-3.5" aria-hidden /> Questions
                </h3>
                <ul className="space-y-1">
                  {results.questions.map((question) => (
                    <li key={question.id}>
                      <button
                        type="button"
                        onClick={() => go(`/admin/questions?q=${term}`)}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2">{question.question}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {question.topic}
                          </span>
                        </span>
                        <Badge variant="secondary">{occupationLabel(question.occupation)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
