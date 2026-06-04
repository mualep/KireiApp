import { Card } from "@/components/ui/card";

export default function AdminAbsensiLoading() {
  return (
    <div className="flex flex-col gap-2.5">
      <section className="tracker-glass-panel flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3 py-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted" />
      </section>
      <Card className="tracker-glass-panel h-16 rounded-xl border" />
      <Card className="tracker-glass-panel h-[28rem] rounded-2xl border" />
    </div>
  );
}
