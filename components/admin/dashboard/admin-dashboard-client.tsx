"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, 
  Coffee, 
  Power, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  UserCheck, 
  Flame,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCounts {
  work: number;
  break: number;
  off: number;
  late: number;
  alpha: number;
}

interface MonthlySummary {
  work_late_seconds: number;
  break_late_seconds: number;
  alpha_count: number;
  sakit_days: number;
  pending_days: number;
  lembur_units: number;
}

interface RecentActivity {
  id: string;
  actor_name: string;
  target_name: string | null;
  domain: string;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface UrgentAlert {
  user_id: string;
  name: string;
  status: "LATE" | "ALPHA";
}

interface DashboardData {
  status_counts: StatusCounts;
  monthly_summary: MonthlySummary;
  recent_activity: RecentActivity[];
  urgent_alerts: UrgentAlert[];
}

interface AdminDashboardClientProps {
  staffName: string;
}

export function AdminDashboardClient({ staffName }: AdminDashboardClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/summary");
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast({
          variant: "destructive",
          title: "Gagal memuat dashboard",
          description: result.error || "Terjadi kesalahan pada server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal memuat dashboard",
        description: "Gagal menghubungi server.",
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchDashboardData();
      toast({
        title: "Dashboard Diperbarui",
        description: "Data summary real-time berhasil diperbarui.",
        className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
      });
    });
  };

  // Helper formatting functions
  function formatDuration(seconds: number): string {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  }

  function formatTimeAgo(isoString: string): string {
    if (!isoString) return "-";
    const diffMs = new Date().getTime() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHr < 24) return `${diffHr}j lalu`;
    return `${diffDay}h lalu`;
  }

  function formatAction(domain: string, action: string): string {
    if (action === "tracker.start") return "Memulai Shift";
    if (action === "tracker.stop") return "Mengakhiri Shift";
    if (action === "tracker.break_start") return "Mulai Istirahat";
    if (action === "tracker.break_stop") return "Selesai Istirahat";
    if (action === "absensi.create") return "Mencatat Kehadiran";
    if (action === "absensi.update") return "Mengubah Absensi";
    if (action === "absensi.delete") return "Menghapus Absensi";
    if (action === "records.override") return "Override Record";
    if (action === "cron.auto_alpha") return "Absensi Alpha Otomatis";
    if (action === "cron.auto_off_shift") return "Clock-Off Otomatis";
    if (action === "cron.alpha_done_reset") return "Reset Status Alpha";

    // Fallback format
    const cleaned = action.replace(/_/g, " ").replace(/\./g, ": ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const { status_counts: counts, monthly_summary: summary, recent_activity: activity, urgent_alerts: alerts } = data;

  const totalEmployees = counts.work + counts.break + counts.off + counts.late + counts.alpha;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="size-8 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Hello, <span className="font-bold text-foreground" translate="no">{staffName}</span> &mdash; Selamat bekerja kembali! (Total {totalEmployees} pemain terdaftar)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <Calendar className="size-3.5" />
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isPending}
            size="icon-lg"
            className="h-10 w-10 border-border bg-background hover:bg-muted"
            title="Refresh Data"
          >
            <RefreshCw className={cn("size-4 text-foreground", isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 2. Top Row (Real-Time Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* WORK CARD */}
        <Card className="border border-border/40 bg-card/35 hover:border-green-500/20 hover:shadow-lg hover:shadow-green-500/2 transition-all rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work</span>
            <div className="size-8 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
              <Play className="size-4 fill-green-400/20" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-foreground tabular-nums leading-none mb-1">{counts.work}</span>
            <span className="text-[10px] text-muted-foreground">Pemain aktif saat ini</span>
          </div>
        </Card>

        {/* BREAK CARD */}
        <Card className="border border-border/40 bg-card/35 hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/2 transition-all rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Break</span>
            <div className="size-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Coffee className="size-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-foreground tabular-nums leading-none mb-1">{counts.break}</span>
            <span className="text-[10px] text-muted-foreground">Sedang beristirahat</span>
          </div>
        </Card>

        {/* OFF CARD */}
        <Card className="border border-border/40 bg-card/35 hover:border-muted/30 hover:shadow-lg hover:shadow-muted/2 transition-all rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Off</span>
            <div className="size-8 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center border border-border">
              <Power className="size-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-foreground tabular-nums leading-none mb-1">{counts.off}</span>
            <span className="text-[10px] text-muted-foreground">Di luar jam kerja</span>
          </div>
        </Card>

        {/* LATE CARD */}
        <Card className="border border-border/40 bg-card/35 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/2 transition-all rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Late</span>
            <div className="size-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-foreground tabular-nums leading-none mb-1">{counts.late}</span>
            <span className="text-[10px] text-muted-foreground">Terlambat masuk shift</span>
          </div>
        </Card>

        {/* ALPHA CARD */}
        <Card className="border border-border/40 bg-card/35 hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/2 transition-all rounded-xl p-5 flex flex-col gap-3 col-span-2 md:col-span-1 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alpha</span>
            <div className="size-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-foreground tabular-nums leading-none mb-1">{counts.alpha}</span>
            <span className="text-[10px] text-muted-foreground">Hari ini absen alpha</span>
          </div>
        </Card>
      </div>

      {/* 3. Middle Section (Grid Split) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Left Column (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Urgent Alerts Banner if any exist */}
          {alerts.length > 0 && (
            <Card className="border border-red-500/30 bg-red-500/5 text-red-400 p-5 rounded-xl flex flex-col gap-3 shadow-md shadow-red-500/2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                <span>URGENT ALERTS: Terdeteksi {alerts.length} Masalah Kehadiran Hari Ini</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {alerts.map((a) => (
                  <Badge 
                    key={a.user_id} 
                    variant="outline" 
                    className={cn(
                      "font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-red-500/30 bg-red-500/10 text-red-400",
                      a.status === "LATE" && "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    )}
                  >
                    {a.name} &mdash; {a.status}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Monthly Summary Bento-Grid */}
          <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
            <div className="flex flex-col gap-1.5 border-b border-border/10 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">Monthly Summary Overview</CardTitle>
              <CardDescription>
                Akumulasi seluruh metrik efektif (Base + Delta) untuk bulan ini.
              </CardDescription>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Work Late Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-amber-500/20 hover:shadow-md hover:shadow-amber-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-amber-500/5 group-hover:text-amber-500/10 transition-colors pointer-events-none select-none">
                  <Clock className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Work Late</span>
                <span className="text-2xl font-extrabold text-amber-400 tabular-nums">{formatDuration(summary.work_late_seconds)}</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Total keterlambatan kerja</span>
              </div>

              {/* Break Late Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-blue-500/20 hover:shadow-md hover:shadow-blue-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-blue-500/5 group-hover:text-blue-500/10 transition-colors pointer-events-none select-none">
                  <Coffee className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Break Late</span>
                <span className="text-2xl font-extrabold text-blue-400 tabular-nums">{formatDuration(summary.break_late_seconds)}</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Total keterlambatan istirahat</span>
              </div>

              {/* Alpha Count Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-red-500/20 hover:shadow-md hover:shadow-red-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-red-500/5 group-hover:text-red-500/10 transition-colors pointer-events-none select-none">
                  <AlertTriangle className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Alpha Count</span>
                <span className="text-2xl font-extrabold text-red-500 tabular-nums">{summary.alpha_count}x</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Total absen alpha</span>
              </div>

              {/* Total Sakit Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none select-none">
                  <UserCheck className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Total Sakit</span>
                <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">{summary.sakit_days} Hari</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Akumulasi hari izin sakit</span>
              </div>

              {/* Pending Days Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-purple-500/20 hover:shadow-md hover:shadow-purple-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-purple-500/5 group-hover:text-purple-500/10 transition-colors pointer-events-none select-none">
                  <Clock className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Pending Days</span>
                <span className="text-2xl font-extrabold text-purple-400 tabular-nums">{summary.pending_days} Hari</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Hari pending belum ditinjau</span>
              </div>

              {/* Lembur Units Card */}
              <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:border-orange-500/20 hover:shadow-md hover:shadow-orange-500/2 transition-all flex flex-col gap-1.5 relative overflow-hidden group">
                <div className="absolute right-3 top-3 text-orange-500/5 group-hover:text-orange-500/10 transition-colors pointer-events-none select-none">
                  <Flame className="size-12" />
                </div>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Lembur Units</span>
                <span className="text-2xl font-extrabold text-orange-400 tabular-nums">{summary.lembur_units} Unit</span>
                <span className="text-[10px] text-muted-foreground leading-snug">Total jam lembur tercatat</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (col-span-2) */}
        <div className="lg:col-span-2">
          <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-5 shadow-xl shadow-primary/2 h-full min-h-[460px]">
            <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">Recent Activity</CardTitle>
              <CardDescription>
                Daftar log tindakan admin terbaru.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 max-h-[380px]">
              {activity.length === 0 ? (
                <div className="text-center text-muted-foreground/60 italic py-16 text-sm">
                  Tidak ada aktivitas terbaru.
                </div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-3 border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase tracking-wider shrink-0 select-none">
                        {item.actor_name.slice(0, 2)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-bold text-foreground truncate block leading-snug">{item.actor_name}</span>
                        <span className="text-xs text-muted-foreground leading-snug truncate block">{formatAction(item.domain, item.action)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0 pl-1">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-5 w-64 rounded" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg shrink-0" />
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/45 p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Middle Split Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Left Column (5 spans) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-xl border border-border/30 bg-card/45 p-6 flex flex-col gap-4 h-[350px]">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-60 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 flex-1">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="border border-border/20 p-4 rounded-lg flex flex-col gap-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (2 spans) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border/30 bg-card/45 p-6 flex flex-col gap-4 h-[350px]">
            <Skeleton className="h-6 w-32 rounded" />
            <div className="flex flex-col gap-3 overflow-hidden flex-1">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
