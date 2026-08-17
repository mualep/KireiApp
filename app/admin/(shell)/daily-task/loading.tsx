import { Skeleton } from "@/components/ui/skeleton";

export default function DailyTaskLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tracker-glass-panel flex flex-col justify-between gap-4 rounded-xl border p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
