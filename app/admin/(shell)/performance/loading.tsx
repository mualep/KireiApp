import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPerformanceLoading() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading Performance">
      <section className="tracker-glass-panel rounded-xl border p-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {["today", "attendance", "monthly-records", "cuti"].map((item) => (
          <Card key={item} size="sm" className="tracker-glass-panel rounded-xl border">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
