import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnterpriseRulesLoading() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6"
    >
      {/* Top Action Skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-36 rounded-lg bg-muted/70" />
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <Skeleton className="h-9 w-full rounded-lg bg-muted/70" />
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-lg bg-muted/70 shrink-0" />
          ))}
        </div>
      </div>

      {/* Accordion List Skeleton */}
      <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5 overflow-hidden">
        <CardContent className="p-4 md:p-6 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/70 bg-card/40 px-4 md:px-5 py-4 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="size-7 rounded-lg bg-muted/80 shrink-0" />
                <Skeleton className="h-5 w-1/2 max-w-sm rounded bg-muted/80" />
                <Skeleton className="h-5 w-16 rounded bg-muted/50 hidden sm:inline-flex" />
              </div>
              <Skeleton className="size-4 rounded shrink-0 bg-muted/60" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
