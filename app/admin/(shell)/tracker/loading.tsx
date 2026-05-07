import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrackerLoading() {
  return (
    <div className="flex flex-col gap-3">
      <section className="tracker-glass-panel flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </section>

      <Card className="tracker-glass-panel rounded-xl border">
        <CardContent className="flex flex-col gap-2 p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </div>
          <Skeleton className="h-7 rounded-lg" />
          <Skeleton className="h-7 rounded-lg" />
        </CardContent>
      </Card>

      <section
        aria-label="Loading worker tracker cards"
        className="tracker-card-grid gap-3"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card
            key={index}
            className="tracker-glass-panel rounded-xl border"
          >
            <CardHeader className="p-3 pb-1.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 p-3 pt-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
              <Skeleton className="h-28 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
