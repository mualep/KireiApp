import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {/* Topbar Filter — 1-to-1 clone of tracker-glass-panel pattern */}
      <div className="tracker-glass-panel flex flex-col gap-0 rounded-xl border py-0">
        <div className="flex flex-col gap-2 p-3">
          {/* Row 1: Search, Shift, SP, Sort, Clear, Counter + Add Worker */}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            {/* Search */}
            <div role="group">
              <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            </div>

            {/* Shift filter */}
            <div role="group" className="relative">
              <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            </div>

            {/* SP Status filter */}
            <div role="group" className="relative">
              <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            </div>

            {/* Sort */}
            <div role="group" className="relative">
              <Skeleton className="h-9 w-full rounded-lg bg-background/55" />
            </div>

            {/* Clear */}
            <Skeleton className="h-9 w-full sm:w-28 rounded-lg bg-background/55" />

            {/* Counter + Add Worker */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg bg-background/35" />
              <Skeleton className="h-9 w-32 rounded-lg bg-muted/80" />
            </div>
          </div>

          {/* Row 2: Role tabs nav */}
          <nav aria-label="Filter berdasarkan role">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-lg bg-background/45" />
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Table — 1-to-1 clone of tracker-glass-panel table */}
      <div className="tracker-glass-panel overflow-hidden rounded-xl border bg-card/75">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">
                  <Skeleton className="h-4 w-20 rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-12 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-12 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-12 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-16 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-10 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-20 mx-auto rounded bg-muted/70" />
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  <Skeleton className="h-4 w-12 mx-auto rounded bg-muted/70" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-36 rounded bg-muted/90" />
                      <Skeleton className="h-3 w-44 rounded bg-muted/50" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-16 rounded bg-muted/60" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-20 rounded bg-muted/60" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-14 rounded bg-muted/60" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-16 rounded bg-muted/60" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-20 rounded-lg bg-muted/70" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
