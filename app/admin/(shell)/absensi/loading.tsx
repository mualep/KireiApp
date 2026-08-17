import { Skeleton } from "@/components/ui/skeleton";

export default function AbsensiLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar Skeleton */}
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Grid Table Skeleton */}
      <div className="tracker-glass-panel rounded-xl border overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-6 w-32 rounded" />
        </div>
        <div className="flex flex-col divide-y divide-border/30 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 gap-2">
              <Skeleton className="h-5 w-40 rounded" />
              <div className="flex gap-1 overflow-hidden">
                {Array.from({ length: 15 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-6 rounded-sm shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
