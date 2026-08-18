import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPerformanceLoading() {
  const calendarDaySkeletons = Array.from({ length: 31 }, (_, i) => i);
  const dayNameSkeletons = Array.from({ length: 7 }, (_, i) => i);
  const recordCardSkeletons = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-6 w-full" aria-label="Loading Performance">
      {/* 1. Header Section Skeleton */}
      <section className="tracker-glass-panel rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </section>

      {/* 2. Main Grid: Daily Task (5 cols) & Calendar (7 cols) Skeletons */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Daily Task Progress Ring Skeleton */}
        <Card className="tracker-glass-panel rounded-2xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-xl lg:col-span-5 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center py-6 px-4 gap-6 flex-1">
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Radial Circle Skeleton */}
              <div className="relative flex items-center justify-center">
                <Skeleton className="size-36 rounded-full" />
              </div>

              <div className="flex flex-col items-center gap-2 text-center w-full">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-3 w-64 rounded" />
              </div>

              <Skeleton className="h-9 w-44 rounded-md mt-2" />
            </div>
          </CardContent>
        </Card>

        {/* Right: Absensi Calendar Grid Skeleton */}
        <Card className="tracker-glass-panel rounded-2xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-xl lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Grid Header Day Names */}
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {dayNameSkeletons.map((i) => (
                <Skeleton key={`dname-${i}`} className="h-3 w-full rounded" />
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDaySkeletons.map((i) => (
                <Skeleton key={`cday-${i}`} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Monthly Records Summary Cards Skeleton */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {recordCardSkeletons.map((i) => (
            <Card key={`rcard-${i}`} className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="size-4 rounded-full" />
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
