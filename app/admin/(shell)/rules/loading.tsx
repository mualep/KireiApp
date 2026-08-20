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
        <Skeleton className="h-9 w-full rounded-lg bg-muted/70" />
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
