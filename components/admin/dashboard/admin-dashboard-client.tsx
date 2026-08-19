"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  RefreshCw, 
  User,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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
  work_late_seconds: { sum: number; workers: number };
  break_late_seconds: { sum: number; workers: number };
  lembur_units: { sum: number; workers: number };
  alpha: { sum: number; workers: number };
  sakit: { sum: number; workers: number };
  pending: { sum: number; workers: number };
}

interface RecentActivity {
  id: string;
  actor_name: string | null;
  actor_tier: string | null;
  target_name: string | null;
  domain: string;
  action: string;
  is_automated?: boolean;
  display_subject?: string;
  display_action?: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface UrgentAlert {
  user_id: string;
  name: string;
  status: "LATE" | "ALPHA";
}

interface HourlyActivityPoint {
  hour: string;
  on: number;
  break: number;
  off: number;
}

interface DashboardData {
  status_counts: StatusCounts;
  monthly_summary: MonthlySummary;
  recent_activity: RecentActivity[];
  urgent_alerts: UrgentAlert[];
  hourly_activity?: HourlyActivityPoint[];
}

interface AdminDashboardClientProps {
  staffName: string;
  initialData?: DashboardData;
}

interface ShiftDef {
  label: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

interface ActiveShiftProgress {
  label: string;
  timeRange: string;
  percentage: number;
}

const shifts: ShiftDef[] = [
  { label: "Shift A", startHour: 6, startMin: 0, endHour: 14, endMin: 0 },
  { label: "Shift 1", startHour: 7, startMin: 0, endHour: 15, endMin: 0 },
  { label: "Shift B", startHour: 8, startMin: 0, endHour: 16, endMin: 0 },
  { label: "Shift C", startHour: 14, startMin: 0, endHour: 22, endMin: 0 },
  { label: "Shift 2", startHour: 15, startMin: 0, endHour: 23, endMin: 0 },
  { label: "Shift D", startHour: 16, startMin: 0, endHour: 0, endMin: 0 },
  { label: "Shift E", startHour: 22, startMin: 0, endHour: 6, endMin: 0 },
  { label: "Shift 3", startHour: 23, startMin: 0, endHour: 7, endMin: 0 },
  { label: "Shift F", startHour: 0, startMin: 0, endHour: 8, endMin: 0 },
];

export function AdminDashboardClient({ staffName, initialData }: AdminDashboardClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(!initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [activeShifts, setActiveShifts] = useState<ActiveShiftProgress[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!initialData && !data) {
        setLoading(true);
      }
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
  }, [initialData, data, toast]);

  useEffect(() => {
    if (!initialData) {
      void fetchDashboardData();
    }
  }, [initialData, fetchDashboardData]);

  // Live shifts calculator hook
  useEffect(() => {
    function recalculateShifts() {
      const now = new Date();
      // Translate current time to WIB (UTC+7)
      const WIB_OFFSET = 7 * 60 * 60 * 1000;
      const wibDate = new Date(now.getTime() + WIB_OFFSET);
      const currentMinutes = wibDate.getUTCHours() * 60 + wibDate.getUTCMinutes();

      const activeList: ActiveShiftProgress[] = [];

      for (const shift of shifts) {
        const startMinTotal = shift.startHour * 60 + shift.startMin;
        const endMinTotal = shift.endHour * 60 + shift.endMin;

        let isActive = false;
        let elapsed = 0;
        let duration = 0;

        if (endMinTotal <= startMinTotal) {
          // Crosses midnight
          isActive = currentMinutes >= startMinTotal || currentMinutes < endMinTotal;
          duration = (1440 - startMinTotal) + endMinTotal;
          if (currentMinutes >= startMinTotal) {
            elapsed = currentMinutes - startMinTotal;
          } else {
            elapsed = (1440 - startMinTotal) + currentMinutes;
          }
        } else {
          // Standard day shift
          isActive = currentMinutes >= startMinTotal && currentMinutes < endMinTotal;
          duration = endMinTotal - startMinTotal;
          elapsed = currentMinutes - startMinTotal;
        }

        if (isActive && duration > 0) {
          const percentage = Math.min(100, Math.max(0, (elapsed / duration) * 100));
          
          const startStr = `${String(shift.startHour).padStart(2, "0")}:${String(shift.startMin).padStart(2, "0")}`;
          const endStr = `${String(shift.endHour).padStart(2, "0")}:${String(shift.endMin).padStart(2, "0")}`;

          activeList.push({
            label: shift.label,
            timeRange: `${startStr} - ${endStr}`,
            percentage: Math.round(percentage * 10) / 10,
          });
        }
      }

      setActiveShifts(activeList);
    }

    recalculateShifts();
    const intervalId = window.setInterval(recalculateShifts, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  function getAvatarClass(tier: string | null | undefined): string {
    const t = tier ? tier.toLowerCase() : "";
    if (t === "owner") {
      return "bg-red-500/10 border-red-500/30 text-red-400";
    }
    if (t === "admin") {
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    }
    if (t === "member") {
      return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    }
    return "bg-zinc-500/10 border-zinc-500/30 text-zinc-400";
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
  
  const summary = data.monthly_summary || { 
    work_late_seconds: 0, 
    break_late_seconds: 0, 
    lembur_units: 0,
    alpha: { sum: 0, workers: 0 },
    sakit: { sum: 0, workers: 0 },
    pending: { sum: 0, workers: 0 }
  };

  const activity = data.recent_activity || [];
  const alerts = data.urgent_alerts || [];
  const hourlyActivity = data.hourly_activity || [];

  // Sort alerts: LATE first (amber), then ALPHA (red)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.status === "LATE" && b.status === "ALPHA") return -1;
    if (a.status === "ALPHA" && b.status === "LATE") return 1;
    return a.name.localeCompare(b.name);
  });

  const lateAlerts = sortedAlerts.filter((a) => a.status === "LATE");
  const alphaAlerts = sortedAlerts.filter((a) => a.status === "ALPHA");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* 1. Header Section */}
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Halo <span translate="no" className="text-primary capitalize">{staffName.toLowerCase()}</span>, selamat bekerja!
        </h1>

        <Button
          onClick={handleRefresh}
          variant="default"
          disabled={isPending}
          size="icon-lg"
          className="h-10 w-10 shrink-0"
          title="Refresh Data"
        >
          <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
        </Button>
      </div>

      {/* 2. URGENT ALERTS SECTION (Hidden if empty) */}
      {sortedAlerts.length > 0 && (
        <Card className="border border-red-500/30 bg-red-500/5 text-red-400 p-5 rounded-xl flex flex-col gap-4 shadow-md shadow-red-500/2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="size-4 text-red-500 shrink-0 animate-pulse" />
              <span className="text-foreground">
                PERINGATAN DARURAT: Terdeteksi <span className="text-red-400 font-extrabold">{sortedAlerts.length}</span> Masalah Kehadiran Hari Ini
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Perlu tindakan cepat</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* LATE Group */}
            {lateAlerts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-400 w-16 shrink-0">LATE ({lateAlerts.length}):</span>
                {lateAlerts.map((a) => (
                  <Badge 
                    key={a.user_id} 
                    variant="outline" 
                    className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-amber-500/35 bg-amber-500/10 text-amber-400"
                  >
                    {a.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* ALPHA Group */}
            {alphaAlerts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-red-400 w-16 shrink-0">ALPHA ({alphaAlerts.length}):</span>
                {alphaAlerts.map((a) => (
                  <Badge 
                    key={a.user_id} 
                    variant="outline" 
                    className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-red-500/35 bg-red-500/10 text-red-400"
                  >
                    {a.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 3. Top Worker Counter Grid */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Side (1/4 width) */}
        <Card className="w-full lg:w-1/4 bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-6 flex flex-col justify-between min-h-[160px] hover:bg-white/5 hover:brightness-125 transition-all duration-300 group">
          <span className="text-sm font-bold uppercase tracking-wider text-white">TOTAL PEKERJA</span>
          <div className="flex flex-col">
            <span className="text-5xl font-black text-white tabular-nums">
              {counts.total_workers}
            </span>
            <span className="text-xs text-zinc-300 mt-1">Pemain terdaftar aktif</span>
          </div>
        </Card>

        {/* Right Side (3/4 width): Grid 2x5 */}
        <div className="w-full lg:w-3/4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* ON Card */}
          <Link 
            href="/admin/tracker?status=ON"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">ON</span>
            <span className="text-3xl font-extrabold text-emerald-500 tabular-nums">
              {counts.on}
            </span>
          </Link>

          {/* OFF Card */}
          <Link 
            href="/admin/tracker?status=OFF"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">OFF</span>
            <span className="text-3xl font-extrabold text-zinc-500 tabular-nums">
              {counts.off}
            </span>
          </Link>

          {/* BREAK Card */}
          <Link 
            href="/admin/tracker?status=BREAK"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">BREAK</span>
            <span className="text-3xl font-extrabold text-yellow-500 tabular-nums">
              {counts.break}
            </span>
          </Link>

          {/* BREAK LATE Card */}
          <Link 
            href="/admin/tracker?status=BREAK"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">BREAK LATE</span>
            <span className="text-3xl font-extrabold text-orange-600 tabular-nums">
              {counts.break_late}
            </span>
          </Link>

          {/* LATE Card */}
          <Link 
            href="/admin/tracker?status=LATE"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">LATE</span>
            <span className="text-3xl font-extrabold text-yellow-500 tabular-nums">
              {counts.late}
            </span>
          </Link>

          {/* ALPHA Card */}
          <Link 
            href="/admin/tracker?status=ALPHA"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">ALPHA</span>
            <span className="text-3xl font-extrabold text-red-500 tabular-nums">
              {counts.alpha}
            </span>
          </Link>

          {/* CUTI Card */}
          <Link 
            href="/admin/tracker?status=CUTI"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">CUTI</span>
            <span className="text-3xl font-extrabold text-blue-500 tabular-nums">
              {counts.cuti}
            </span>
          </Link>

          {/* SAKIT Card */}
          <Link 
            href="/admin/tracker?status=SAKIT"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">SAKIT</span>
            <span className="text-3xl font-extrabold text-orange-500 tabular-nums">
              {counts.sakit}
            </span>
          </Link>

          {/* PENDING Card */}
          <Link 
            href="/admin/tracker?status=PENDING"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">PENDING</span>
            <span className="text-3xl font-extrabold text-purple-500 tabular-nums">
              {counts.pending}
            </span>
          </Link>

          {/* LEMBUR Card */}
          <Link 
            href="/admin/tracker?status=LEMBUR"
            className="bg-card/60 backdrop-blur-md border border-border shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 hover:brightness-125 transition-all duration-300 cursor-pointer group"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">LEMBUR</span>
            <span className="text-3xl font-extrabold text-yellow-600 tabular-nums">
              {counts.lembur}
            </span>
          </Link>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY SECTION */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-5 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Aktivitas Terbaru
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Catatan aksi manual staff dan eksekusi otomatis sistem
          </p>
        </div>

        <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-1">
          {activity.length === 0 ? (
            <div className="text-center text-muted-foreground/60 italic py-12 text-sm">
              Tidak ada aktivitas terbaru.
            </div>
          ) : (
            activity.map((item) => {
              const subjectName = item.display_subject || item.actor_name || item.target_name || "System";
              const avatarInitial = subjectName.charAt(0);

              return (
                <div key={item.id} className="flex justify-between items-center gap-3 border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "size-8 rounded-full border flex items-center justify-center font-bold text-sm uppercase shrink-0 select-none",
                      getAvatarClass(item.actor_tier)
                    )}>
                      {avatarInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-muted-foreground leading-snug">
                        <span className="font-bold text-foreground">{subjectName}</span> &mdash;{" "}
                        <span className="text-foreground/90 font-medium">
                          {item.display_action || item.action}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0 pl-2">
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 5. 24-HOUR ACTIVITY LINE CHART SECTION */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-5 shadow-xl shadow-primary/2">
        <div className="flex items-center justify-between border-b border-border/10 pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-500" />
              Aktivitas Pekerja (24 Jam Terakhir WIB)
            </CardTitle>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold text-xs">
            Live Sync
          </Badge>
        </div>

        <div className="w-full h-64 min-h-[250px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 11 }}
                interval={1}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "0.75rem",
                  backdropFilter: "blur(12px)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
                formatter={(value: unknown) => [`${value} Pekerja ON`, "Status ON"]}
                labelFormatter={(label) => `Jam ${label} WIB`}
              />
              <Line
                type="monotone"
                dataKey="on"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#0f172a" }}
                activeDot={{ r: 6, stroke: "#22c55e", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 6. LIVE SHIFT PROGRESS BARS SECTION */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Ringkasan Shift Aktif</CardTitle>
        </div>

        <div className="flex flex-col gap-6">
          {activeShifts.length === 0 ? (
            <div className="text-center text-muted-foreground/60 italic py-6 text-sm">
              Tidak ada shift aktif saat ini.
            </div>
          ) : (
            activeShifts.map((shift) => (
              <div key={shift.label} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-sans font-bold text-[10px] px-2.5 h-6 uppercase tracking-wider border-primary/25 bg-primary/5 text-primary">
                      {shift.label}
                    </Badge>
                    <span className="text-muted-foreground">{shift.timeRange}</span>
                  </div>
                  <span className="text-foreground tabular-nums">{shift.percentage}%</span>
                </div>
                <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-border/40">
                  <div 
                    className="bg-gradient-to-r from-primary to-rose-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${shift.percentage}%` }} 
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 7. MONTHLY SUMMARY BENTO GRID SECTION */}
      <Card className="tracker-glass-panel rounded-xl border p-6 flex flex-col gap-6 shadow-xl shadow-primary/2">
        <div className="flex flex-col gap-1.5 border-b border-border/10 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Ringkasan Bulanan</CardTitle>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Work Late Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-yellow-500/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Work Late</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-yellow-500">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.work_late_seconds?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-yellow-500">
                <span className="text-xl font-extrabold tabular-nums">{formatDuration(summary.work_late_seconds?.sum || 0)}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Total keterlambatan kerja</span>
          </div>

          {/* Break Late Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-orange-600/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Break Late</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-orange-600">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.break_late_seconds?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-orange-600">
                <span className="text-xl font-extrabold tabular-nums">{formatDuration(summary.break_late_seconds?.sum || 0)}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Total keterlambatan istirahat</span>
          </div>

          {/* Alpha Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-red-500/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Alpha</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-red-500">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.alpha?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-red-500">
                <span className="text-xl font-extrabold tabular-nums">{summary.alpha?.sum || 0}d</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Total absen alpha</span>
          </div>

          {/* Sakit Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-orange-500/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Sakit</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-orange-500">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.sakit?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-orange-500">
                <span className="text-xl font-extrabold tabular-nums">{summary.sakit?.sum || 0}d</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Akumulasi hari izin sakit</span>
          </div>

          {/* Pending Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-purple-500/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Pending</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-purple-500">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.pending?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-purple-500">
                <span className="text-xl font-extrabold tabular-nums">{summary.pending?.sum || 0}d</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Hari pending belum ditinjau</span>
          </div>

          {/* Lembur Card */}
          <div className="p-4 rounded-xl border border-border/40 bg-card/30 hover:shadow-md transition-all flex flex-col gap-1.5 group hover:border-yellow-600/20">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Lembur</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-yellow-600">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0" />
                  <span className="text-xl font-extrabold tabular-nums">{summary.lembur_units?.workers || 0}</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border/40 rounded-lg p-2 flex flex-col items-center justify-center text-yellow-600">
                <span className="text-xl font-extrabold tabular-nums">{formatDuration((summary.lembur_units?.sum || 0) * 60)}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">Total jam lembur tercatat</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton className="h-10 w-80 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      </div>

      {/* Top Status Cards skeleton */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Side skeleton */}
        <div className="w-full lg:w-1/4 rounded-2xl border border-border bg-card/45 p-6 h-[160px] flex flex-col justify-between">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-12 w-16 rounded" />
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

      {/* Activity Line Chart skeleton */}
      <div className="rounded-xl border border-border bg-card/45 p-6 h-[300px]">
        <Skeleton className="h-6 w-56 rounded mb-2" />
        <Skeleton className="h-4 w-80 rounded mb-6" />
        <Skeleton className="h-48 w-full rounded-lg" />
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
