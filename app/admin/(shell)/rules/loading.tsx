import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnterpriseRulesLoading() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6"
    >
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl bg-muted/80 shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-64 rounded-lg bg-muted/90" />
            <Skeleton className="h-4 w-96 max-w-full rounded bg-muted/60" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg bg-muted/70 shrink-0" />
          ))}
        </div>
        <Skeleton className="h-9 w-full md:w-72 rounded-lg bg-muted/70" />
      </div>

      {/* Accordion List Skeleton */}
      <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5 overflow-hidden">
        <CardContent className="p-4 md:p-6 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card/40 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-lg bg-muted/80 shrink-0" />
                <Skeleton className="h-5 w-3/4 max-w-md rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
