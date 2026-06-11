import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRecordsLoading() {
  return (
    <div className="flex flex-col gap-3">
      <section className="tracker-glass-panel flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3 py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-20" />
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="tracker-glass-panel h-24 rounded-xl border" />
        <Card className="tracker-glass-panel h-24 rounded-xl border" />
        <Card className="tracker-glass-panel h-24 rounded-xl border" />
        <Card className="tracker-glass-panel h-24 rounded-xl border" />
      </div>
      <Card className="tracker-glass-panel h-[28rem] rounded-2xl border" />
    </div>
  );
}
