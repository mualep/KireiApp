import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function UsersLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* High-Fidelity Users Filter Toolbar Skeleton */}
      <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="flex flex-col gap-2 p-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
              {/* Search */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Shift Filter */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* SP Filter */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Sort */}
              <div role="group">
                <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
              </div>
              {/* Clear */}
              <Skeleton className="h-9 w-full sm:w-28 rounded-lg bg-background/55" />
              {/* Add Worker Button */}
              <Skeleton className="h-9 w-32 rounded-lg bg-muted/80" />
            </div>

            {/* Role Tabs Nav */}
            <nav className="w-full">
              <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-lg bg-background/45" />
                ))}
              </div>
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* High-Fidelity Users Table Skeleton */}
      <section className="tracker-glass-panel overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between border-b border-border/75 px-4 py-3">
          <Skeleton className="h-5 w-44 rounded bg-muted/80" />
          <Skeleton className="h-5 w-24 rounded bg-muted/80" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/75 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-3 w-56"><Skeleton className="h-4 w-28 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-20 rounded bg-muted/70" /></th>
                <th className="p-3 w-28"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full bg-muted/80" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                        <Skeleton className="h-3 w-44 rounded bg-muted/50" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded bg-background/50" /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-7 w-7 rounded-md bg-muted/70" />
                      <Skeleton className="h-7 w-7 rounded-md bg-muted/70" />
                      <Skeleton className="h-7 w-7 rounded-md bg-muted/70" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
