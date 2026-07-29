import { CardSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Generic loading state used by route-level `loading.tsx` files. */
export function PageSkeleton({
  stats = 4,
  variant = "cards",
}: {
  stats?: number;
  variant?: "cards" | "table";
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {stats > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {variant === "table" ? (
        <div className="glass rounded-xl p-6">
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass space-y-3 rounded-xl p-6">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">Loading…</span>
    </div>
  );
}
