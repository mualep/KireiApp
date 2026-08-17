import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DailyTaskReviewLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6" aria-hidden="true">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg shrink-0 bg-muted/80" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-8 w-60 rounded-lg bg-muted/90" />
            <Skeleton className="h-4 w-72 rounded bg-muted/50" />
          </div>
        </div>
        <Skeleton className="h-10 w-40 rounded-lg bg-muted/80" />
      </div>

      {/* Toolbar / Filters */}
      <Card className="tracker-glass-panel rounded-xl border p-4 shadow-md shadow-primary/2">
        <CardContent className="p-0">
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
                <th className="px-5 py-4">Nama Pekerja</th>
                <th className="px-5 py-4">Shift</th>
                <th className="px-5 py-4">Game</th>
                <th className="px-5 py-4">Submitted At</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-40 rounded bg-muted/90" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-5 w-16 rounded bg-muted/60" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-5 w-24 rounded bg-muted/60" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-20 rounded bg-muted/50" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-24 rounded-full bg-muted/80" />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-24 rounded-lg bg-muted/80" />
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
