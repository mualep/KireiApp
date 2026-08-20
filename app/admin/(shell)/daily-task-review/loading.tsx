import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DailyTaskReviewLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6" aria-hidden="true">
      {/* Top Action Button Skeleton */}
      <div className="flex items-center justify-end">
        <Skeleton className="h-9 w-36 rounded-lg bg-muted/80" />
      </div>

      {/* Toolbar / Filters Card */}
      <Card className="tracker-glass-panel rounded-xl border p-4 shadow-md shadow-primary/2">
        <CardContent className="p-0 flex flex-col gap-4">
          {/* View Switcher Tabs Skeleton */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50 gap-1 shrink-0">
              <Skeleton className="h-8 w-44 rounded-lg bg-muted/80" />
              <Skeleton className="h-8 w-52 rounded-lg bg-muted/40" />
            </div>
          </div>

          {/* Filter Inputs Grid Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="grid flex-1 gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <Skeleton className="h-10 w-full rounded-lg bg-background/55" />
              <Skeleton className="h-10 w-full rounded-lg bg-background/55" />
              <Skeleton className="h-10 w-full rounded-lg bg-background/55" />
              <Skeleton className="h-10 w-full rounded-lg bg-background/55" />
            </div>
            <Skeleton className="h-4 w-36 rounded bg-muted/50 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="tracker-glass-panel rounded-xl border shadow-xl shadow-primary/5">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-4">
                  <Skeleton className="h-4 w-28 rounded bg-muted/70" />
                </th>
                <th className="px-5 py-4">
                  <Skeleton className="h-4 w-32 rounded bg-muted/70" />
                </th>
                <th className="px-5 py-4">
                  <Skeleton className="h-4 w-32 rounded bg-muted/70" />
                </th>
                <th className="px-5 py-4">
                  <Skeleton className="h-4 w-28 rounded bg-muted/70" />
                </th>
                <th className="px-5 py-4 text-center">
                  <Skeleton className="h-4 w-16 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-5 py-4 text-right">
                  <Skeleton className="h-4 w-16 ml-auto rounded bg-muted/70" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                      <Skeleton className="h-4 w-16 rounded bg-muted/50" />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-40 rounded bg-muted/60" />
                      <Skeleton className="h-4 w-32 rounded bg-muted/50" />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24 rounded bg-muted/60" />
                      <Skeleton className="h-3 w-16 rounded bg-muted/40" />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-28 rounded bg-muted/50" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-24 rounded-full bg-muted/70" />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-20 rounded-lg bg-muted/80" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
