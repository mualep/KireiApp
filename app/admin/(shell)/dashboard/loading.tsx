import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8"
    >
      {/* 1. Header Section */}
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          <Skeleton className="h-10 w-80 rounded-lg bg-muted/80" />
        </h1>
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-muted/80" />
      </div>

      {/* 2. Top Status Cards */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Side (1/4 width) */}
        <Card className="w-full lg:w-1/4 bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-6 flex flex-col justify-between min-h-[160px]">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">TOTAL PEKERJA</span>
          <div className="flex flex-col gap-2 mt-2">
            <Skeleton className="h-12 w-20 rounded-lg bg-muted/90" />
            <Skeleton className="h-3 w-36 rounded bg-muted/50" />
          </div>
        </Card>

        {/* Right Side (3/4 width): Grid 2x5 */}
        <div className="w-full lg:w-3/4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {["ON", "OFF", "BREAK", "BREAK LATE", "LATE", "ALPHA", "CUTI", "SAKIT", "PENDING", "LEMBUR"].map((label) => (
            <div
              key={label}
              className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
              <Skeleton className="h-8 w-12 rounded-lg bg-muted/80 mt-3" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Activity Section */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-5 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Aktivitas Terbaru</CardTitle>
        </div>

        <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center gap-3 border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="size-8 rounded-full shrink-0 bg-muted/80" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 max-w-sm rounded bg-muted/80" />
                </div>
              </div>
              <Skeleton className="h-3 w-16 shrink-0 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Urgent Alerts Section */}
      <Card className="border border-border/40 bg-card/40 p-5 rounded-xl flex flex-col gap-3 shadow-md">
        <div className="flex items-center gap-2 font-bold text-sm text-muted-foreground">
          <Skeleton className="size-4 shrink-0 rounded bg-muted/80" />
          <Skeleton className="h-4 w-72 rounded bg-muted/80" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-28 rounded-full bg-muted/70" />
          ))}
        </div>
      </Card>

      {/* 5. Live Shift Progress Bars Section */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Ringkasan Shift Aktif</CardTitle>
        </div>

        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded bg-muted/70" />
                  <Skeleton className="h-4 w-28 rounded bg-muted/50" />
                </div>
                <Skeleton className="h-4 w-8 rounded bg-muted/80" />
              </div>
              <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-border/40">
                <Skeleton className="h-full w-1/2 rounded-full bg-muted/80" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 6. Monthly Summary Bento-Grid */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1.5 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Ringkasan Bulanan</CardTitle>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {["Work Late", "Break Late", "Alpha", "Sakit", "Pending", "Lembur"].map((label) => (
            <div key={label} className="p-4 rounded-xl border border-border/40 bg-card/30 flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">{label}</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center">
                  <Skeleton className="h-6 w-12 rounded bg-muted/80" />
                </div>
                <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center">
                  <Skeleton className="h-6 w-12 rounded bg-muted/80" />
                </div>
              </div>
              <Skeleton className="h-3 w-28 rounded bg-muted/40 mt-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
