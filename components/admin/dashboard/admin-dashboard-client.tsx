"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  UserCheck, 
  Flame,
  Coffee
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCounts {
  total_workers: number;
  on: number;
  off: number;
  break: number;
  break_late: number;
  cuti: number;
  sakit: number;
  pending: number;
  lembur: number;
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setErrorMsg(result.error || "Gagal memuat data dari server.");
        toast({
          variant: "destructive",
          title: "Gagal memuat dashboard",
          description: result.error || "Terjadi kesalahan pada server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan koneksi.";
      setErrorMsg(msg);
      toast({
        variant: "destructive",
        title: "Gagal memuat dashboard",
        description: msg,
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
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    const diffMs = new Date().getTime() - date.getTime();
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

  if (errorMsg && !data) {
    return (
      <div className="w-full max-w-md mx-auto my-16 p-6 border border-red-500/30 bg-red-500/5 text-red-400 rounded-xl flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Gagal Memuat Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="font-bold border-red-500/20 bg-background text-red-400 hover:bg-red-500/10">
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const counts = data.status_counts || {
    total_workers: 0,
    on: 0,
    off: 0,
    break: 0,
    break_late: 0,
    cuti: 0,
    sakit: 0,
    pending: 0,
    lembur: 0,
    late: 0,
    alpha: 0
  };
  const summary = data.monthly_summary || { work_late_seconds: 0, break_late_seconds: 0, alpha_count: 0, sakit_days: 0, pending_days: 0, lembur_units: 0 };
  const activity = data.recent_activity || [];
  const alerts = data.urgent_alerts || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-light text-foreground leading-tight">
          Halo <span className="font-bold text-primary">{staffName}</span>, selamat bekerja!
        </h1>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-sm text-muted-foreground font-medium tabular-nums">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
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

      {/* 2. Top Status Cards */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Side (1/4 width) */}
        <Card className="w-full lg:w-1/4 bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-6 flex flex-col justify-between min-h-[160px] hover:shadow-md hover:border-primary/20 transition-all group">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Worker</span>
          <div className="flex flex-col">
            <span className="text-5xl font-black text-primary tabular-nums group-hover:scale-105 transition-transform origin-left">
              {counts.total_workers}
            </span>
            <span className="text-xs text-muted-foreground mt-1">Pemain terdaftar aktif</span>
          </div>
        </Card>

        {/* Right Side (3/4 width): Grid 2x5 */}
        <div className="w-full lg:w-3/4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* ON Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ON</span>
            <span className="text-3xl font-extrabold text-emerald-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.on}
            </span>
          </div>

          {/* OFF Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-zinc-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">OFF</span>
            <span className="text-3xl font-extrabold text-zinc-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.off}
            </span>
          </div>

          {/* BREAK Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-yellow-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-500">BREAK</span>
            <span className="text-3xl font-extrabold text-yellow-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.break}
            </span>
          </div>

          {/* BREAK LATE Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-orange-600/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-650">BREAK LATE</span>
            <span className="text-3xl font-extrabold text-orange-600 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.break_late}
            </span>
          </div>

          {/* LATE Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-yellow-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-550">LATE</span>
            <span className="text-3xl font-extrabold text-yellow-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.late}
            </span>
          </div>

          {/* ALPHA Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-red-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">ALPHA</span>
            <span className="text-3xl font-extrabold text-red-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.alpha}
            </span>
          </div>

          {/* CUTI Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-blue-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">CUTI</span>
            <span className="text-3xl font-extrabold text-blue-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.cuti}
            </span>
          </div>

          {/* SAKIT Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-orange-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500">SAKIT</span>
            <span className="text-3xl font-extrabold text-orange-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.sakit}
            </span>
          </div>

          {/* PENDING Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-purple-500/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">PENDING</span>
            <span className="text-3xl font-extrabold text-purple-500 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.pending}
            </span>
          </div>

          {/* LEMBUR Card */}
          <div className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-yellow-600/20 transition-all group">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-650">LEMBUR</span>
            <span className="text-3xl font-extrabold text-yellow-600 tabular-nums group-hover:translate-x-1 transition-transform">
              {counts.lembur}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Recent Activity & Shift Overview */}
      <div className="flex flex-col gap-6 w-full">
        {/* Recent Activity */}
        <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-5 shadow-xl shadow-primary/2">
          <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Recent Activity</CardTitle>
            <CardDescription>
              Daftar log tindakan admin terbaru.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <div className="text-center text-muted-foreground/60 italic py-12 text-sm">
                Tidak ada aktivitas terbaru.
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-3 border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0 select-none">
                      {(item.actor_name || "S").slice(0, 1)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground leading-snug">
                        <span className="font-bold">{item.actor_name || "System"}</span> &mdash;{" "}
                        {formatAction(item.domain, item.action)}
                        {item.target_name ? (
                          <>
                            {" "}
                            &mdash; <span className="font-bold text-primary">{item.target_name}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0 pl-2">
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

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

        {/* Active Shifts Overview */}
        <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
          <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
            <CardTitle className="text-lg font-bold text-foreground">Active Shifts Overview</CardTitle>
            <CardDescription>
              Persentase alokasi pemain aktif di setiap shift kerja saat ini.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-6">
            {/* Shift C */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-primary/25 bg-primary/5 text-primary">
                    Shift C
                  </Badge>
                  <span className="text-muted-foreground">14:00 - 22:00</span>
                </div>
                <span className="text-foreground tabular-nums">45%</span>
              </div>
              <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-border/40">
                <div className="bg-gradient-to-r from-primary to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: "45%" }} />
              </div>
            </div>

            {/* Shift 2 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-primary/25 bg-primary/5 text-primary">
                    Shift 2
                  </Badge>
                  <span className="text-muted-foreground">15:00 - 23:00</span>
                </div>
                <span className="text-foreground tabular-nums">33%</span>
              </div>
              <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-border/40">
                <div className="bg-gradient-to-r from-primary to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: "33%" }} />
              </div>
            </div>

            {/* Shift D */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-primary/25 bg-primary/5 text-primary">
                    Shift D
                  </Badge>
                  <span className="text-muted-foreground">16:00 - 00:00</span>
                </div>
                <span className="text-foreground tabular-nums">20%</span>
              </div>
              <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-border/40">
                <div className="bg-gradient-to-r from-primary to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </Card>

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
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton className="h-10 w-80 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="size-10 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Top Status Cards skeleton */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Side skeleton */}
        <div className="w-full lg:w-1/4 rounded-2xl border border-border bg-card/45 p-6 h-[160px] flex flex-col justify-between">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-16 rounded" />
        </div>
        {/* Right Side skeleton */}
        <div className="w-full lg:w-3/4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/45 p-4 h-[86px] flex flex-col justify-between">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-6 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity skeleton */}
      <div className="rounded-xl border border-border bg-card/45 p-6 h-[350px]">
        <Skeleton className="h-6 w-40 rounded mb-4" />
        <Skeleton className="h-4 w-60 rounded mb-6" />
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Shifts Overview skeleton */}
      <div className="rounded-xl border border-border bg-card/45 p-6">
        <Skeleton className="h-6 w-48 rounded mb-4" />
        <Skeleton className="h-4 w-64 rounded mb-6" />
        <div className="flex flex-col gap-6">
          {[...Array(3)].map((_, j) => (
            <div key={j} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-8 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary skeleton */}
      <div className="rounded-xl border border-border bg-card/45 p-6">
        <Skeleton className="h-6 w-48 rounded mb-4" />
        <Skeleton className="h-4 w-64 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, j) => (
            <div key={j} className="border border-border/20 p-4 rounded-xl flex flex-col gap-2 h-[100px]">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-2 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
