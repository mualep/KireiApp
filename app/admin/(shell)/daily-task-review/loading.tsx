import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DailyTaskReviewLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* High-Fidelity Daily Task Review Filter Bar Skeleton */}
      <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-40 rounded-lg bg-background/55" />
              <Skeleton className="h-9 w-28 rounded-lg bg-muted/80" />
            </div>
            <Skeleton className="h-9 w-36 rounded-lg bg-background/35" />
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
          </div>
        </CardContent>
      </Card>

      {/* High-Fidelity Review Table / Card Container Skeleton */}
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
                <th className="p-3"><Skeleton className="h-4 w-20 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-24 rounded bg-muted/70" /></th>
                <th className="p-3"><Skeleton className="h-4 w-20 rounded bg-muted/70" /></th>
                <th className="p-3 w-28"><Skeleton className="h-4 w-16 rounded bg-muted/70" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                      <Skeleton className="h-3 w-24 rounded bg-muted/50" />
                    </div>
                  </td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-28 rounded bg-background/50" /></td>
                  <td className="p-3"><Skeleton className="h-6 w-24 rounded-full bg-muted/80" /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-8 w-20 rounded-md bg-muted/80" />
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
