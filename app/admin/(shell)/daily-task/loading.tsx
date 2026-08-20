import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DailyTaskLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6" aria-hidden="true">
      {/* View Switcher Tabs Skeleton (Aligned Right) */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50 gap-1 shrink-0">
          <Skeleton className="h-8 w-32 rounded-lg bg-muted/80" />
          <Skeleton className="h-8 w-32 rounded-lg bg-muted/40" />
        </div>
      </div>

      {/* Main Form Fields Card */}
      <Card className="tracker-glass-panel rounded-xl border p-6 md:p-8 flex flex-col gap-6 shadow-xl shadow-primary/5">
        {/* Row 1: Nama Player | Shift Kerja */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
        </div>

        {/* Row 2: Nama Buyer | Keterangan Task */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
        </div>

        {/* Row 3: Link Streaming | Link SS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded bg-muted/70" />
            <Skeleton className="h-20 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40 rounded bg-muted/70" />
            <Skeleton className="h-20 w-full rounded-lg bg-muted/50" />
          </div>
        </div>

        {/* Row 4: SS Before | SS After | Durasi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded bg-muted/70" />
            <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
          </div>
        </div>

        {/* Row 5: Pilihan Game (Pills) */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28 rounded bg-muted/70" />
          <div className="flex flex-wrap gap-2 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg bg-muted/60" />
            ))}
          </div>
        </div>

        {/* Row 6: Catatan / Kendala */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32 rounded bg-muted/70" />
          <Skeleton className="h-20 w-full rounded-lg bg-muted/50" />
        </div>
      </Card>

      {/* Checklist Sections Skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48 rounded bg-muted/80" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/30 bg-card/40 p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
          >
            <div className="flex items-start gap-4 flex-1 w-full">
              <Skeleton className="size-5 rounded shrink-0 mt-0.5 bg-muted/80" />
              <div className="flex flex-col gap-2 w-full max-w-md">
                <Skeleton className="h-4 w-3/4 rounded bg-muted/90" />
                <Skeleton className="h-3 w-1/2 rounded bg-muted/50" />
              </div>
            </div>
            <Skeleton className="h-10 w-full md:w-72 rounded-lg bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Submit Button Skeleton */}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-11 w-44 rounded-xl bg-muted/80" />
      </div>
    </div>
  );
}
