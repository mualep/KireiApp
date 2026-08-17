import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function TrackerLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* High-Fidelity TrackerFilterForm Skeleton */}
      <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
              {/* Search */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Shift */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Status */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Sort */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Clear Button */}
              <Skeleton className="h-9 w-full sm:w-28 rounded-lg bg-background/55" />
              {/* Counter */}
              <Skeleton className="h-9 w-28 rounded-lg bg-background/35" />
            </div>
          </div>

          {/* Role Tabs */}
          <nav className="w-full">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-lg bg-background/45" />
              ))}
            </div>
          </nav>
        </CardContent>
      </Card>

      {/* High-Fidelity TrackerCard Grid Skeleton (9 Cards) */}
      <section aria-label="Loading worker cards" className="tracker-card-grid gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card
            key={i}
            size="sm"
            className="tracker-worker-card tracker-glass-panel relative gap-0 overflow-hidden rounded-xl border py-0"
          >
            <CardHeader className="tracker-card-header relative z-10 p-2">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Worker Name */}
                  <Skeleton className="h-5 w-32 rounded bg-muted/80" />
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    {/* Role & Shift Badge */}
                    <Skeleton className="h-6 w-36 rounded-sm bg-background/45" />
                  </div>
                </div>
                {/* Status Badge */}
                <div className="shrink-0 pt-0.5 pr-1">
                  <Skeleton className="h-6 w-20 rounded-full bg-muted/90" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative z-10 flex flex-col gap-2.5 px-5 pt-0 pb-3">
              {/* Record Badges Row */}
              <section className="flex flex-wrap gap-1.5">
                <Skeleton className="h-5 w-14 rounded bg-background/40" />
                <Skeleton className="h-5 w-16 rounded bg-background/40" />
                <Skeleton className="h-5 w-16 rounded bg-background/40" />
                <Skeleton className="h-5 w-12 rounded bg-background/40" />
                <Skeleton className="h-5 w-12 rounded bg-background/40" />
              </section>
            </CardContent>

            <CardFooter className="relative z-10 flex flex-col items-stretch gap-2.5 border-t border-border/70 bg-background/25 px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full rounded-md bg-muted/70" />
                <Skeleton className="h-9 w-full rounded-md bg-muted/70" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}
