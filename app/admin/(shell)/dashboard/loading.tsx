import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8"
    >
      {/* 1. Header Section */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-72 rounded-lg bg-muted/90" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-muted/80" />
      </div>

      {/* 2. Top Status Cards */}
      <div className="flex w-full flex-col gap-6 lg:flex-row">
        {/* Left Side (1/4 width - Total Workers) */}
        <Card className="flex min-h-[160px] w-full flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md shadow-sm lg:w-1/4">
          <Skeleton className="h-4 w-28 rounded bg-muted/70" />
          <div className="flex flex-col gap-2 mt-3">
            <Skeleton className="h-12 w-20 rounded bg-muted/90" />
            <Skeleton className="h-3 w-36 rounded bg-muted/50" />
          </div>
        </Card>

        {/* Right Side (3/4 width - 10 Status Cards 2x5 Grid) */}
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-5 lg:w-3/4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-md shadow-sm"
            >
              <Skeleton className="h-3.5 w-12 rounded bg-muted/70" />
              <Skeleton className="mt-4 h-8 w-10 rounded bg-muted/90" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Activity Section */}
      <Card className="tracker-glass-panel flex flex-col gap-5 rounded-xl border p-6 shadow-xl">
        <div className="border-b border-border/20 pb-4">
          <Skeleton className="h-6 w-40 rounded bg-muted/90" />
        </div>
        <div className="flex flex-col divide-y divide-border/20">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="size-8 shrink-0 rounded-full bg-muted/80" />
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 max-w-md rounded bg-muted/90" />
                </div>
              </div>
              <Skeleton className="h-3 w-16 shrink-0 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Urgent Alerts Section */}
      <Card className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 p-5 shadow-md">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded bg-muted/80" />
          <Skeleton className="h-4 w-80 rounded bg-muted/90" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-32 rounded-full bg-muted/70" />
          ))}
        </div>
      </Card>

      {/* 5. Live Shift Progress Bars Section */}
      <Card className="tracker-glass-panel flex flex-col gap-6 rounded-xl border p-6 shadow-xl">
        <div className="border-b border-border/20 pb-4">
          <Skeleton className="h-6 w-44 rounded bg-muted/90" />
        </div>
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded bg-muted/80" />
                  <Skeleton className="h-4 w-28 rounded bg-muted/50" />
                </div>
                <Skeleton className="h-4 w-10 rounded bg-muted/80" />
              </div>
              <Skeleton className="h-3 w-full rounded-full bg-muted/40" />
            </div>
          ))}
        </div>
      </Card>

      {/* 6. Monthly Summary Bento-Grid */}
      <Card className="tracker-glass-panel flex flex-col gap-6 rounded-xl border p-6 shadow-xl">
        <div className="border-b border-border/20 pb-4">
          <Skeleton className="h-6 w-44 rounded bg-muted/90" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/30 p-4"
            >
              <Skeleton className="h-3.5 w-24 rounded bg-muted/70" />
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Skeleton className="h-12 rounded-lg bg-background/50 border border-border/30" />
                <Skeleton className="h-12 rounded-lg bg-background/50 border border-border/30" />
              </div>
              <Skeleton className="h-3 w-32 rounded bg-muted/40 mt-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
