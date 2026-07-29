import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton h-4 w-full", className)} {...props} />;
}

/** Table placeholder used by admin list pages while data streams in. */
function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-6" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="glass space-y-3 rounded-xl p-6" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export { Skeleton, TableSkeleton, CardSkeleton };
