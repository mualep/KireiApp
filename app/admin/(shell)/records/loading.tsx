import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RecordsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* High-Fidelity RecordsToolbar Skeleton */}
      <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="records-toolbar-row flex flex-col gap-2 lg:flex-row lg:items-center">
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

            {/* Month Nav */}
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
          <nav className="records-toolbar-tabs w-full">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-lg bg-background/45" />
              ))}
            </div>
          </nav>
        </CardContent>
      </Card>

      {/* High-Fidelity RecordsSummaryCards Skeleton (7 Cards) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} size="sm" className="tracker-glass-panel rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded bg-muted/70" />
              <Skeleton className="h-9 w-9 rounded-lg bg-muted/60" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-7 w-16 rounded bg-muted/90" />
            </div>
          </Card>
        ))}
      </div>

      {/* High-Fidelity RecordsTable Skeleton */}
      <section className="tracker-glass-panel overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between gap-3 border-b border-border/75 px-4 py-3">
          <Skeleton className="h-5 w-44 rounded bg-muted/80" />
          <Skeleton className="h-5 w-24 rounded bg-muted/80" />
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-border/75 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-3 w-56"><Skeleton className="h-4 w-28 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3 w-16"><Skeleton className="h-4 w-12 rounded bg-muted/70" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                      <Skeleton className="h-3 w-20 rounded bg-muted/50" />
                    </div>
                  </td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-14 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-7 w-7 rounded-md bg-muted/60" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
