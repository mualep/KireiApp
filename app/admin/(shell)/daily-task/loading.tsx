import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DailyTaskLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8"
    >
      {/* Header Shell Skeleton */}
      <div className="mb-2 flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg bg-muted/80" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-56 rounded-lg bg-muted/90" />
          <Skeleton className="h-4 w-80 rounded-md bg-muted/50" />
        </div>
      </div>

      {/* Main Form Fields Card Skeleton */}
      <Card className="tracker-glass-panel flex flex-col gap-6 rounded-xl border p-6 shadow-xl md:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40 rounded bg-muted/70" />
            <div className="mt-1 flex flex-wrap gap-2.5">
              <Skeleton className="h-9 w-20 rounded-lg bg-muted/60" />
              <Skeleton className="h-9 w-24 rounded-lg bg-muted/60" />
              <Skeleton className="h-9 w-20 rounded-lg bg-muted/60" />
            </div>
          </div>
        </div>
      </Card>

      {/* Task List Sections Skeleton (3 Phase Cards) */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-start justify-between gap-5 rounded-xl border border-border/40 bg-card/20 p-5 md:flex-row md:items-center"
          >
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="mt-0.5 size-5 shrink-0 rounded bg-muted/80" />
                <Skeleton className="h-4 w-3/4 max-w-sm rounded bg-muted/90" />
              </div>
              <Skeleton className="h-3 w-1/2 max-w-xs rounded bg-muted/50" />
            </div>
            <Skeleton className="h-[56px] w-full rounded-lg bg-muted/40 md:w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
