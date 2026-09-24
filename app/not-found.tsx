
import { T } from "@/components/translated-text";
import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="app-shell-bg grid min-h-dvh place-items-center p-6">
      <div className="glass w-full max-w-md rounded-xl p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-7 w-7" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-primary"><T>{"404"}</T></p>
        <h1 className="mt-1 text-xl font-bold tracking-tight"><T>{"Page not found"}</T></h1>
        <p className="mt-2 text-sm text-muted-foreground"><T>{" The page you were looking for doesn't exist, or you don't have access to it. "}</T></p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard"><T>{"Go to dashboard"}</T></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/"><T>{"Home"}</T></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
