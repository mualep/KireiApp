import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="tracker-glass-panel flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="tracker-glass-panel flex flex-col gap-4 rounded-xl border p-5">
          <Skeleton className="h-6 w-40 rounded" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="tracker-glass-panel flex flex-col gap-4 rounded-xl border p-5">
          <Skeleton className="h-6 w-40 rounded" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
