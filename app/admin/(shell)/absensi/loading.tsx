import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AbsensiLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* High-Fidelity AbsensiToolbar Skeleton */}
      <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="absensi-toolbar-row flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="grid flex-1 gap-2 md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,auto)_minmax(8rem,auto)_auto]">
              {/* Search */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Sort */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Shift */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Clear */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-full sm:w-32 rounded-lg bg-background/55" />
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg bg-background/55" />
              <Skeleton className="h-9 min-w-32 rounded-lg bg-background/35" />
              <Skeleton className="h-9 w-9 rounded-lg bg-background/55" />
            </div>

            {/* Counter */}
            <div className="flex items-center gap-2 lg:ml-auto">
              <Skeleton className="h-9 w-28 rounded-lg bg-background/35" />
            </div>
          </div>

          {/* Role Tabs */}
          <nav className="absensi-toolbar-tabs w-full">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-lg bg-background/45" />
              ))}
            </div>
          </nav>
        </CardContent>
      </Card>

      {/* High-Fidelity AbsensiMonthGrid Skeleton */}
      <section className="tracker-glass-panel overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between gap-3 border-b border-border/75 px-3 py-2">
          <Skeleton className="h-5 w-48 rounded bg-muted/80" />
          <Skeleton className="h-5 w-32 rounded bg-muted/80" />
        </div>

        {/* Scrollable Month Matrix */}
        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            {/* Table Header */}
            <div className="flex border-b border-border/75 bg-muted/30 px-3 py-2 text-xs">
              <div className="w-56 shrink-0 font-semibold">
                <Skeleton className="h-4 w-28 rounded bg-muted/80" />
              </div>
              <div className="flex flex-1 gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <Skeleton className="h-3 w-4 rounded bg-muted/60" />
                    <Skeleton className="h-4 w-5 rounded bg-muted/80" />
                  </div>
                ))}
              </div>
            </div>

            {/* Table Rows (8 Workers) */}
            <div className="flex flex-col divide-y divide-border/30">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center px-3 py-2 text-xs">
                  {/* Worker Name & Role Column */}
                  <div className="w-56 shrink-0 flex flex-col gap-1 pr-2">
                    <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                    <Skeleton className="h-3 w-20 rounded bg-muted/50" />
                  </div>

                  {/* Day Status Matrix (30 Days) */}
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: 30 }).map((_, j) => (
                      <Skeleton
                        key={j}
                        className="h-7 flex-1 min-w-0 rounded border border-border/40 bg-background/30"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
