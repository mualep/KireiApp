import { Skeleton } from "@/components/ui/skeleton";

export default function DailyTaskReviewLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Header & Filters Skeleton */}
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Task Review Table Skeleton */}
      <div className="tracker-glass-panel overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b border-border/40 p-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex flex-col divide-y divide-border/30 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-3 w-32 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
