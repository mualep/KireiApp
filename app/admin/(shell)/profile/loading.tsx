import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="tracker-glass-panel flex flex-col gap-4 rounded-2xl border p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      </div>

      <div className="tracker-glass-panel flex flex-col gap-4 rounded-xl border p-5">
        <Skeleton className="h-6 w-36 rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
