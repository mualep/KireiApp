import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Header Banner Skeleton */}
      <div className="tracker-glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Skeleton (10 Status Badges) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="tracker-glass-panel flex flex-col justify-between rounded-xl border p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <Skeleton className="h-8 w-12 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Urgent Alerts & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Urgent Alerts Skeleton (1 col) */}
        <div className="tracker-glass-panel flex flex-col gap-4 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Skeleton (2 cols) */}
        <div className="tracker-glass-panel flex flex-col gap-4 rounded-2xl border p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="flex flex-col divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
