import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DailyTaskLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8" aria-hidden="true">
      {/* Header Visual Shell */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="size-8 rounded-lg shrink-0 bg-muted/80" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-9 w-64 rounded-lg bg-muted/90" />
          <Skeleton className="h-4 w-96 rounded bg-muted/50" />
        </div>
      </div>

      {/* Main Form Container */}
      <div className="flex flex-col gap-8">
        {/* Main Form Fields Card */}
        <Card className="tracker-glass-panel rounded-xl border p-6 md:p-8 flex flex-col gap-6 shadow-xl shadow-primary/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded bg-muted/70" />
              <div className="flex flex-wrap gap-2.5 mt-1">
                <Skeleton className="h-9 w-24 rounded-lg bg-muted/60" />
                <Skeleton className="h-9 w-28 rounded-lg bg-muted/60" />
                <Skeleton className="h-9 w-24 rounded-lg bg-muted/60" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36 rounded bg-muted/70" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
            </div>
          </div>
        </Card>

        {/* Task lists skeletons */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card/20 p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="flex items-start gap-4 flex-1 w-full">
                <Skeleton className="size-5 rounded shrink-0 mt-0.5 bg-muted/80" />
                <div className="flex flex-col gap-2 w-full max-w-md">
                  <Skeleton className="h-4 w-3/4 rounded bg-muted/90" />
                  <Skeleton className="h-3 w-1/2 rounded bg-muted/50" />
                </div>
              </div>
              <div className="w-full md:w-80">
                <Skeleton className="h-[56px] w-full rounded-lg bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
