"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarCheckIcon,
  ClockIcon,
  CoffeeIcon,
  ListTodoIcon,
  RefreshCw,
  ShieldCheckIcon,
  UserCheckIcon,
  ZapIcon,
} from "lucide-react";

import { TrackerStatusBadge } from "@/components/admin/tracker/tracker-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemberPerformanceData } from "@/lib/performance/data";
import { cn } from "@/lib/utils";

type MemberDashboardClientProps = {
  data: MemberPerformanceData;
};

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatLemburMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function MemberDashboardClient({ data }: MemberDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const { user, profile, status, monthlyRecords, monthlyAttendance, dailyTask, todayWIB } = data;

  // Format Duration helper (seconds to min/hrs)
  const formatSecondsToMinutes = (seconds: number) => {
    if (seconds <= 0) return "0 m";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs} j ${remMins} m`;
    }
    return `${mins} m`;
  };

  // Calendar calculations
  const [yearStr, monthStr, dayStr] = todayWIB.split("-");
  const currentYear = Number(yearStr);
  const currentMonthIdx = Number(monthStr) - 1; // 0-indexed
  const todayDayNum = Number(dayStr);

  const monthName = INDONESIAN_MONTHS[currentMonthIdx] || "";
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  const calendarDays = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const getTodayRingClass = (attStatus: string | undefined) => {
    switch (attStatus) {
      case "hadir":
        return "ring-emerald-500";
      case "cuti":
        return "ring-sky-500";
      case "sakit":
        return "ring-amber-500";
      case "pending":
        return "ring-purple-500";
      case "alpha":
        return "ring-rose-500";
      default:
        return "ring-primary";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* 1. Header Section (Matches Admin Dashboard layout) */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge
              variant="outline"
              className="h-6 border-primary/30 bg-primary/10 font-medium text-primary text-xs"
            >
              Member Dashboard
            </Badge>
            {profile.gid ? (
              <Badge
                variant="outline"
                className="h-6 border-border bg-background/50 text-xs text-muted-foreground font-mono"
              >
                {profile.gid}
              </Badge>
            ) : null}
            <Badge
              variant="outline"
              className="h-6 border-border bg-background/50 text-xs text-muted-foreground"
            >
              Shift {profile.shift} • {profile.employeeRole}
            </Badge>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Halo <span translate="no" className="text-primary capitalize">{user.name.toLowerCase()}</span>, selamat bekerja!
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Status Terkini
            </span>
            <TrackerStatusBadge status={status.displayStatus} prominent />
          </div>

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
      </div>

      {/* Mobile status badge fallback */}
      <div className="flex sm:hidden items-center justify-between border-b pb-3 border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status Terkini
        </span>
        <TrackerStatusBadge status={status.displayStatus} prominent />
      </div>

      {/* 2. Main Grid: Daily Task Progress Ring & Calendar */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Daily Task Progress Widget (5 cols) */}
        <Card className="tracker-glass-panel rounded-2xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-xl lg:col-span-5 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ListTodoIcon className="size-5 text-primary" />
                Daily Checklist Player
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Progress pengisian tugas harian Anda hari ini
              </CardDescription>
            </div>
            {dailyTask.status ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs capitalize font-medium",
                  dailyTask.status === "approved" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  dailyTask.status === "rejected" && "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                  dailyTask.status === "pending_review" && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {dailyTask.status.replace("_", " ")}
              </Badge>
            ) : null}
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center py-6 px-4 gap-6 flex-1">
            {dailyTask.hasTaskToday ? (
              <div className="flex flex-col items-center gap-4 w-full">
                {/* SVG Radial Progress Ring */}
                <div className="relative flex items-center justify-center">
                  <svg className="size-36 -rotate-90 transform" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      className="stroke-muted/50"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      className={cn(
                        "transition-all duration-700 ease-out",
                        dailyTask.percentage === 100
                          ? "stroke-emerald-500"
                          : dailyTask.percentage >= 50
                            ? "stroke-primary"
                            : "stroke-amber-500"
                      )}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - dailyTask.percentage / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-heading text-3xl font-extrabold text-foreground">
                      {dailyTask.percentage}%
                    </span>
                    <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
                      Selesai
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {dailyTask.completedCount} dari {dailyTask.totalCount} tugas tercentang
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dailyTask.percentage === 100
                      ? "Hebat! Semua checklist hari ini telah lengkap."
                      : "Lengkapi sisa checklist Anda sebelum shift berakhir."}
                  </p>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto gap-2 mt-2">
                  <Link href="/admin/daily-task">
                    Buka Checklist Player
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4 gap-3 max-w-xs">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-inner">
                  <AlertCircleIcon className="size-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-foreground text-base">
                    Atur daily task terlebih dahulu
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Anda belum membuat checklist harian untuk tanggal hari ini ({todayWIB}).
                  </p>
                </div>
                <Button asChild className="gap-2 mt-2 font-semibold">
                  <Link href="/admin/daily-task">
                    Isi Daily Checklist Sekarang
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absensi Calendar Grid Widget (7 cols) */}
        <Card className="tracker-glass-panel rounded-2xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-xl lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarCheckIcon className="size-5 text-primary" />
                Kalender Absensi — {monthName} {currentYear}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Catatan kehadiran Anda selama bulan berjalan
              </CardDescription>
            </div>

            {/* Legend badges */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="size-2 rounded-full bg-emerald-500" /> H (Hadir)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-sky-600 dark:text-sky-400 font-medium">
                <span className="size-2 rounded-full bg-sky-500" /> C (Cuti)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-amber-600 dark:text-amber-400 font-medium">
                <span className="size-2 rounded-full bg-amber-500" /> S (Sakit)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-purple-600 dark:text-purple-400 font-medium">
                <span className="size-2 rounded-full bg-purple-500" /> P (Pending)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-rose-600 dark:text-rose-400 font-medium">
                <span className="size-2 rounded-full bg-rose-500" /> A (Alpha)
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Grid Header Day Names */}
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {DAY_NAMES.map((d) => (
                <span key={d} className="text-[0.7rem] font-bold uppercase text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {paddingDays.map((p) => (
                <div key={`pad-${p}`} className="h-10 rounded-lg bg-transparent" />
              ))}

              {calendarDays.map((dayNum) => {
                const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const attStatus = monthlyAttendance[dateStr];
                const isToday = dayNum === todayDayNum;
                const isFuture = dayNum > todayDayNum;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "flex flex-col items-center justify-center h-10 rounded-lg border text-xs font-semibold transition-all relative",
                      isToday && cn("ring-2 ring-offset-1 ring-offset-background", getTodayRingClass(attStatus)),
                      attStatus === "hadir" && "bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 font-bold",
                      attStatus === "cuti" && "bg-sky-500/15 border-sky-500/35 text-sky-600 dark:text-sky-400 font-bold",
                      attStatus === "sakit" && "bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400 font-bold",
                      attStatus === "pending" && "bg-purple-500/15 border-purple-500/35 text-purple-600 dark:text-purple-400 font-bold",
                      attStatus === "alpha" && "bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400 font-bold",
                      !attStatus && !isFuture && "bg-muted/30 border-border/40 text-muted-foreground",
                      isFuture && "bg-muted/15 border-border/20 text-muted-foreground/40"
                    )}
                    title={
                      attStatus
                        ? `${dateStr}: Status ${attStatus.toUpperCase()}`
                        : `${dateStr}`
                    }
                  >
                    <span>{dayNum}</span>
                    {attStatus ? (
                      <span className="text-[0.6rem] font-bold uppercase tracking-tighter opacity-90 leading-none">
                        {attStatus.charAt(0).toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Monthly Records Summary Cards */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserCheckIcon className="size-5 text-primary" />
            Ringkasan Performa & Records Bulanan
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Periode: {monthName} {currentYear}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Card 1: Work Late */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Work Late</span>
              <ClockIcon className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {formatSecondsToMinutes(monthlyRecords.workLateSeconds)}
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Keterlambatan masuk shift</p>
            </div>
          </Card>

          {/* Card 2: Break Late */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Break Late</span>
              <CoffeeIcon className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {formatSecondsToMinutes(monthlyRecords.breakLateSeconds)}
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Kelebihan waktu istirahat</p>
            </div>
          </Card>

          {/* Card 3: Sakit */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Sakit</span>
              <AlertCircleIcon className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {monthlyRecords.sakitDays} <span className="text-xs font-medium">Hari</span>
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Izin sakit terdata</p>
            </div>
          </Card>

          {/* Card 4: Pending */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Pending</span>
              <ClockIcon className="size-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {monthlyRecords.pendingDays} <span className="text-xs font-medium">Hari</span>
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Menunggu verifikasi</p>
            </div>
          </Card>

          {/* Card 5: Cuti Stock */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Sisa Stok Cuti</span>
              <ShieldCheckIcon className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {monthlyRecords.cutiStock} <span className="text-xs font-medium">Hari</span>
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Hak kuota cuti tersedia</p>
            </div>
          </Card>

          {/* Card 6: Lembur */}
          <Card className="tracker-glass-panel rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Lembur</span>
              <ZapIcon className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-2xl font-black text-foreground">
                {formatLemburMinutes(monthlyRecords.lemburUnits)}
              </span>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">Akumulasi jam lembur</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
