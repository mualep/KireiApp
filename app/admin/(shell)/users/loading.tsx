import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Toolbar & Search Skeleton */}
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Users Table Skeleton */}
      <div className="tracker-glass-panel overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b border-border/40 p-4">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex flex-col divide-y divide-border/30 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
