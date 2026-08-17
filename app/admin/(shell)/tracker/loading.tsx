import { Skeleton } from "@/components/ui/skeleton";

export default function TrackerLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Filter Form Skeleton */}
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Tracker Card Grid Skeleton (9 cards matching exact layout) */}
      <section aria-label="Loading worker cards" className="tracker-card-grid gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="tracker-glass-panel flex flex-col justify-between rounded-xl border p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3">
              {/* Header: Name & Role */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-32 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Badges / Metrics */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <Skeleton className="h-8 rounded-md" />
                <Skeleton className="h-8 rounded-md" />
                <Skeleton className="h-8 rounded-md" />
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/40 pt-3">
              <Skeleton className="h-9 rounded-sm" />
              <Skeleton className="h-9 rounded-sm" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
