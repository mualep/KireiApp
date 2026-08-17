import { Skeleton } from "@/components/ui/skeleton";

export default function RecordsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Toolbar Skeleton */}
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-2 md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,auto)_minmax(8rem,auto)_auto]">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-8 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-8 rounded-lg" />
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tracker-glass-panel flex flex-col justify-between rounded-xl border p-4">
            <Skeleton className="h-4 w-28 rounded mb-2" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="tracker-glass-panel overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b border-border/40 p-4">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex flex-col divide-y divide-border/30 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-5 w-36 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
