import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { getPdfsForUser } from "@/lib/queries/learner";
import { occupationLabel } from "@/lib/constants";
import { PdfLibrary } from "@/components/learn/pdf-library";

export const metadata: Metadata = {
  title: "Learning material",
  description: "PDFs published for your trade.",
};

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; highlight?: string }>;
}) {
  const user = await currentUser();
  if (!user?.id || !user.occupation) redirect("/onboarding");

  const params = await searchParams;
  const query = params.q?.slice(0, 120) ?? "";
  const tab = params.tab === "bookmarked" ? "bookmarked" : "all";

  const pdfs = await getPdfsForUser(user.id, user.occupation, {
    q: query,
    onlyBookmarked: tab === "bookmarked",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Learning material</h1>
        <p className="mt-1 text-muted-foreground">
          Documents published for {occupationLabel(user.occupation)}. Read in the browser, download
          for offline study, or bookmark for later.
        </p>
      </header>

      <PdfLibrary
        pdfs={pdfs}
        initialQuery={query}
        initialTab={tab}
        highlightId={params.highlight}
      />
    </div>
  );
}
