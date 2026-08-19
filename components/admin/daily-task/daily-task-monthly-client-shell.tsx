"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Calendar as CalendarIcon,
  Search,
  FileSpreadsheet,
  ListTodo,
} from "lucide-react";
import type { MonthlyReportData, MonthlyTaskDTO } from "@/lib/daily-task/monthly-data";
import { cn } from "@/lib/utils";

interface DailyTaskMonthlyClientShellProps {
  data: MonthlyReportData;
  isMemberMode?: boolean;
  basePath: string; // "/admin/daily-task-review" or "/admin/daily-task"
}

const DAY_NAMES_IND = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatMinutesToHours(minutes: number | null): string {
  if (typeof minutes !== "number" || minutes <= 0) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}j (${minutes}m)` : `${hours}j ${mins}m (${minutes}m)`;
}

export function DailyTaskMonthlyClientShell({
  data,
  isMemberMode = false,
  basePath,
}: DailyTaskMonthlyClientShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");

  // State for interactive report dialog
  const [selectedTaskData, setSelectedTaskData] = useState<{
    task: MonthlyTaskDTO;
    workerName: string;
  } | null>(null);

  const { monthParam, year, month, monthName, totalDaysInMonth, rows } = data;

  // Calculate today WIB date number for member calendar today-ring
  const todayWIB = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date()); // YYYY-MM-DD

  const currentYearMonth = todayWIB.slice(0, 7);
  const isCurrentMonth = monthParam === currentYearMonth;
  const todayDayNum = isCurrentMonth ? Number(todayWIB.slice(8, 10)) : -1;

  // First day of week for member calendar padding (0 = Sun)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const calendarDays = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // Month navigation helpers
  const handleMonthChange = (newMonthParam: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "monthly");
      params.set("month", newMonthParam);
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  const handlePrevMonth = () => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevParam = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    handleMonthChange(prevParam);
  };

  const handleNextMonth = () => {
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextParam = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    handleMonthChange(nextParam);
  };

  // Filter rows
  const filteredRows = rows.filter((row) => {
    if (shiftFilter !== "all" && row.shift.toLowerCase() !== shiftFilter.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const workerMatch = row.worker_name.toLowerCase().includes(q);

      // Search inside daily tasks for this worker
      const taskMatch = Object.values(row.days).some((taskList) => {
        if (!taskList || taskList.length === 0) return false;
        return taskList.some(
          (task) =>
            task.buyer_name?.toLowerCase().includes(q) ||
            task.task_description?.toLowerCase().includes(q) ||
            task.problem_notes?.toLowerCase().includes(q)
        );
      });

      return workerMatch || taskMatch;
    }

    return true;
  });

  const renderUrlLink = (url: string | null | undefined, fallbackText = "-") => {
    if (!url || !url.trim()) return <span className="text-muted-foreground/45 italic">{fallbackText}</span>;

    const tokens = url.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <span className="text-muted-foreground/45 italic">{fallbackText}</span>;

    return (
      <div className="flex flex-col gap-1">
        {tokens.map((token, idx) => {
          const isUrl = /^https?:\/\/\S+/i.test(token) || (token.includes(".") && !token.includes(" "));
          const href = /^https?:\/\//i.test(token) ? token : `https://${token}`;

          if (isUrl) {
            return (
              <a
                key={idx}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium inline-flex items-center gap-1 break-all"
              >
                <span>{token}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            );
          }

          return (
            <span key={idx} className="text-foreground/90 break-all">
              {token}
            </span>
          );
        })}
      </div>
    );
  };

  const renderCellContent = (
    tasks: MonthlyTaskDTO[] | undefined,
    attStatus: string | null | undefined,
    workerName: string
  ) => {
    if (tasks && tasks.length > 0) {
      return (
        <div className="flex flex-col gap-1 items-center justify-center">
          {tasks.map((task) => {
            let badgeLabel = "NOTE";
            let badgeStyle =
              "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

            if (task.status === "pending_review") {
              badgeLabel = "PEND";
              badgeStyle =
                "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400";
            } else if (task.status === "rejected") {
              badgeLabel = "REJ";
              badgeStyle =
                "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400";
            } else if (task.status === "draft") {
              badgeLabel = "DRAFT";
              badgeStyle =
                "border-muted-foreground/40 bg-muted/40 text-muted-foreground";
            }

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskData({ task, workerName })}
                className={cn(
                  "inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer",
                  badgeStyle
                )}
                title={`Klik untuk melihat laporan ${workerName} (${task.task_date})`}
              >
                {badgeLabel}
              </button>
            );
          })}
        </div>
      );
    }

    // Fallback to Attendance Status if no daily task submitted
    if (attStatus) {
      switch (attStatus) {
        case "hadir":
          return <span className="font-extrabold text-xs text-emerald-500">H</span>;
        case "cuti":
          return <span className="font-extrabold text-xs text-sky-500">C</span>;
        case "sakit":
          return <span className="font-extrabold text-xs text-amber-500">S</span>;
        case "pending":
          return <span className="font-extrabold text-xs text-purple-500">P</span>;
        case "alpha":
          return <span className="font-extrabold text-xs text-rose-500">A</span>;
        default:
          return <span className="text-muted-foreground/30 font-semibold text-xs">-</span>;
      }
    }

    return <span className="text-muted-foreground/30 font-semibold text-xs">-</span>;
  };

  const getAttendanceBackgroundClass = (attStatus: string | null | undefined) => {
    switch (attStatus) {
      case "hadir":
        return "bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400";
      case "cuti":
        return "bg-sky-500/15 border-sky-500/35 text-sky-600 dark:text-sky-400";
      case "sakit":
        return "bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400";
      case "pending":
        return "bg-purple-500/15 border-purple-500/35 text-purple-600 dark:text-purple-400";
      case "alpha":
        return "bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400";
      default:
        return "bg-muted/20 border-border/30 text-muted-foreground";
    }
  };

  const memberRow = rows[0] || null;

  return (
    <div className="flex flex-col gap-6">
      {/* View Switcher & Toolbar */}
      <Card className="tracker-glass-panel rounded-xl border p-4 shadow-md shadow-primary/2">
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* View Switcher Tabs (Daily vs Monthly) */}
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50">
              <Link
                href={`${basePath}?view=daily`}
                className={cn(
                  "h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  searchParams.get("view") !== "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListTodo className="size-3.5" />
                {isMemberMode ? "Formulir Hari Ini" : "Tampilan Harian (Review)"}
              </Link>
              <Link
                href={`${basePath}?view=monthly&month=${monthParam}`}
                className={cn(
                  "h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  searchParams.get("view") === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileSpreadsheet className="size-3.5" />
                {isMemberMode ? "Laporan Bulanan" : "Tampilan Bulanan (Report Grid)"}
              </Link>
            </div>

            {/* Month Selector Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                disabled={isPending}
                className="h-9 w-9 shrink-0"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="relative flex items-center">
                <CalendarIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="month"
                  value={monthParam}
                  onChange={(e) => e.target.value && handleMonthChange(e.target.value)}
                  disabled={isPending}
                  className="rounded-lg border border-input pl-9 pr-3 py-1.5 text-xs font-bold h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                disabled={isPending}
                className="h-9 w-9 shrink-0"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Search & Shift Filters (Admin Only) */}
          {!isMemberMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 pt-3">
              <div role="group" className="relative flex items-center sm:col-span-2">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pekerja, buyer, atau keterangan task..."
                  autoComplete="off"
                  className="w-full rounded-lg border border-input pl-9 pr-3 py-1.5 text-xs h-9 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3"
                />
              </div>

              <div role="group" className="relative flex flex-col">
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input px-3 py-1.5 pr-9 text-xs h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3"
                >
                  <option value="all">Semua Shift</option>
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                  <option value="flexible">Flexible</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* MEMBER VIEW: 7-Column Calendar Grid                           */}
      {/* ------------------------------------------------------------- */}
      {isMemberMode ? (
        <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5">
          <div className="flex flex-row items-center justify-between border-b border-border/75 px-6 py-4">
            <div>
              <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" />
                Kalender Laporan Bulanan — {monthName} {year}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Riwayat tugas harian dan status absensi Anda selama bulan berjalan
              </p>
            </div>

            {/* Legend badges */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="size-2 rounded-full bg-emerald-500" /> NOTE (Disetujui)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-amber-600 dark:text-amber-400 font-bold">
                <span className="size-2 rounded-full bg-amber-500" /> PEND (Pending)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-rose-600 dark:text-rose-400 font-bold">
                <span className="size-2 rounded-full bg-rose-500" /> A (Alpha)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-sky-600 dark:text-sky-400 font-bold">
                <span className="size-2 rounded-full bg-sky-500" /> C (Cuti)
              </span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-amber-600 dark:text-amber-400 font-bold">
                <span className="size-2 rounded-full bg-amber-500" /> S (Sakit)
              </span>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Grid Header Day Names */}
            <div className="grid grid-cols-7 gap-2 text-center mb-3">
              {DAY_NAMES_IND.map((d) => (
                <span key={d} className="text-xs font-extrabold uppercase text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days 7-Col Grid */}
            <div className="grid grid-cols-7 gap-2">
              {paddingDays.map((p) => (
                <div key={`pad-${p}`} className="h-16 rounded-xl bg-transparent" />
              ))}

              {calendarDays.map((dayNum) => {
                const tasks = memberRow?.days[dayNum] || [];
                const attStatus = memberRow?.attendance[dayNum] || null;
                const isToday = dayNum === todayDayNum;

                return (
                  <div
                    key={`mday-${dayNum}`}
                    className={cn(
                      "h-16 rounded-xl border relative flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all p-1",
                      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      getAttendanceBackgroundClass(attStatus)
                    )}
                  >
                    <span className="text-xs font-bold leading-none">{dayNum}</span>
                    <div className="flex items-center justify-center">
                      {renderCellContent(tasks, attStatus, memberRow?.worker_name || "Pemain")}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ------------------------------------------------------------- */
        /* ADMIN VIEW: Ultra-Compact Table Grid (Matching Absensi Table)  */
        /* ------------------------------------------------------------- */
        <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/75 px-5 py-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <h2 className="font-bold text-foreground text-base">
                Employee Report Grid — {monthName} {year}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filteredRows.length} Pekerja Terdaftar
            </span>
          </div>

          {/* Horizontally Scrollable Compact Matrix Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs border-spacing-0">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-bold">
                  {/* Sticky Left Column: Worker Header */}
                  <th className="sticky left-0 z-30 bg-muted/90 backdrop-blur-md p-3 w-48 min-w-[190px] border-r border-border/60 shadow-sm">
                    Worker
                  </th>

                  {/* 31 Ultra-Compact Day Headers (1, 2, 3... 31) */}
                  {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => (
                    <th
                      key={`col-${dayNum}`}
                      className="w-12 min-w-[48px] p-2 text-center border-r border-border/40 font-bold"
                    >
                      <span className="text-xs font-bold text-muted-foreground">{dayNum}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={totalDaysInMonth + 1}
                      className="p-12 text-center text-muted-foreground/60 italic"
                    >
                      Tidak ada data laporan tugas harian yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.user_id} className="hover:bg-muted/10 transition-colors">
                      {/* Sticky Left Cell: Worker Name */}
                      <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-md p-3 w-48 min-w-[190px] border-r border-border/60 shadow-sm align-middle">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-extrabold text-foreground text-xs truncate" translate="no">
                            {row.worker_name}
                          </span>
                          <Badge
                            variant="outline"
                            className="w-fit text-[9px] font-bold border-border bg-muted/30 h-4 px-1.5"
                          >
                            Shift {row.shift.toUpperCase()}
                          </Badge>
                        </div>
                      </td>

                      {/* 31 Compact Day Cells */}
                      {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => {
                        const tasks = row.days[dayNum] || [];
                        const attStatus = row.attendance[dayNum];
                        return (
                          <td
                            key={`cell-${row.user_id}-${dayNum}`}
                            className="w-12 min-w-[48px] p-2 text-center align-middle border-r border-border/25 bg-card/30 hover:bg-card/75 transition-colors"
                          >
                            {renderCellContent(tasks, attStatus, row.worker_name)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Interactive Detail Report Modal / Dialog */}
      {selectedTaskData && (
        <Dialog
          open={!!selectedTaskData}
          onOpenChange={(open) => !open && setSelectedTaskData(null)}
        >
          <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border p-6 md:p-8">
            <DialogHeader className="gap-1.5">
              <DialogTitle>
                Laporan Tugas (Employee Report): {selectedTaskData.workerName}
              </DialogTitle>
              <DialogDescription>
                Pengumpulan untuk tanggal {selectedTaskData.task.task_date} pada Shift{" "}
                {selectedTaskData.task.shift_label?.toUpperCase() || "A"}
              </DialogDescription>
            </DialogHeader>

            {/* General Info / Employee Report Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-border/20 my-4 text-sm">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Nama Buyer:
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedTaskData.task.buyer_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Status Laporan:
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-[11px] px-2.5 h-6 uppercase tracking-wider mt-0.5",
                        selectedTaskData.task.status === "approved" && "border-green-500/35 bg-green-500/10 text-green-400",
                        selectedTaskData.task.status === "rejected" && "border-red-500/35 bg-red-500/10 text-red-400",
                        selectedTaskData.task.status === "pending_review" && "border-yellow-500/35 bg-yellow-500/10 text-yellow-400",
                        selectedTaskData.task.status === "draft" && "border-gray-500/35 bg-gray-500/10 text-gray-400"
                      )}
                    >
                      {selectedTaskData.task.status === "pending_review" ? "Pending" : selectedTaskData.task.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Keterangan Task:
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedTaskData.task.task_description || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Link Streaming:
                  </span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderUrlLink(selectedTaskData.task.stream_name)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Problem / Kendala:
                  </span>
                  <span className="font-medium text-amber-500">
                    {selectedTaskData.task.problem_notes || "-"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-border/20 pt-3 md:pt-0 md:pl-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Jam SS Before:
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedTaskData.task.ss_before_time ? selectedTaskData.task.ss_before_time.slice(0, 5) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Jam SS After:
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedTaskData.task.ss_after_time ? selectedTaskData.task.ss_after_time.slice(0, 5) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Total Durasi:
                    </span>
                    <span className="font-bold text-foreground">
                      {formatMinutesToHours(selectedTaskData.task.process_duration_minutes)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Link SS Before:
                  </span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderUrlLink(selectedTaskData.task.ss_before_url)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Link SS After:
                  </span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderUrlLink(selectedTaskData.task.ss_after_url)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">
                    Pilihan Game:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {!selectedTaskData.task.selected_games || selectedTaskData.task.selected_games.length === 0 ? (
                      <span className="text-muted-foreground/50 italic text-xs">-</span>
                    ) : (
                      selectedTaskData.task.selected_games.map((g) => (
                        <Badge
                          key={g}
                          variant="outline"
                          className="font-semibold text-[10px] border-primary/20 bg-primary/5 text-primary"
                        >
                          {g}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <DialogFooter className="mt-4 pt-4 border-t border-border/20">
              <Button
                variant="outline"
                onClick={() => setSelectedTaskData(null)}
                className="font-bold h-10 px-6 ml-auto"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
