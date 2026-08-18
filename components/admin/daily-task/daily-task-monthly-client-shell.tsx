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
  Calendar,
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

const DAY_NAMES = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
      const taskMatch = Object.values(row.days).some((task) => {
        if (!task) return false;
        return (
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
    const trimmed = url.trim();
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium inline-flex items-center gap-1 break-all"
      >
        <span>{trimmed}</span>
        <ExternalLink className="size-3 shrink-0" />
      </a>
    );
  };

  const renderTaskCell = (task: MonthlyTaskDTO | null, workerName: string) => {
    if (!task) {
      return <span className="text-muted-foreground/30 font-semibold text-xs text-center block">-</span>;
    }

    let badgeLabel = "Note";
    let badgeStyle = "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

    if (task.status === "pending_review") {
      badgeLabel = "Pending";
      badgeStyle = "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400";
    } else if (task.status === "rejected") {
      badgeLabel = "Rejected";
      badgeStyle = "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400";
    } else if (task.status === "draft") {
      badgeLabel = "Draft";
      badgeStyle = "border-muted-foreground/40 bg-muted/40 text-muted-foreground";
    }

    return (
      <button
        type="button"
        onClick={() => setSelectedTaskData({ task, workerName })}
        className={cn(
          "inline-flex items-center justify-center px-2 py-1 rounded-md border text-[11px] font-extrabold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer",
          badgeStyle
        )}
        title={`Klik untuk melihat laporan ${workerName} (${task.task_date})`}
      >
        {badgeLabel}
      </button>
    );
  };

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
                <Calendar className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
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

          {/* Search & Shift Filters */}
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

      {/* Monthly Employee Report Matrix Table Card */}
      <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/75 px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              Employee Report Grid — {monthName} {year}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredRows.length} {isMemberMode ? "Pemain" : "Pekerja Terdaftar"}
          </span>
        </div>

        {/* Horizontally Scrollable Matrix Grid Table */}
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-xs border-spacing-0">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-bold">
                {/* Sticky Left Column: Worker Name */}
                <th className="sticky left-0 z-30 bg-muted/90 backdrop-blur-md p-3.5 w-44 min-w-[170px] border-r border-border/60 shadow-sm">
                  Nama Pekerja / Shift
                </th>

                {/* 31 Day Columns (Compact 90px width) */}
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const dateObj = new Date(year, month - 1, dayNum);
                  const dayName = DAY_NAMES[dateObj.getDay()];
                  const isSunday = dateObj.getDay() === 0;

                  return (
                    <th
                      key={`col-${dayNum}`}
                      className={cn(
                        "p-2.5 w-[90px] min-w-[90px] text-center border-r border-border/40 font-bold",
                        isSunday && "bg-rose-500/10 text-rose-500"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-foreground text-xs font-extrabold">
                          {dayNum}
                        </span>
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground">
                          {dayName}
                        </span>
                      </div>
                    </th>
                  );
                })}
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
                    <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-md p-3.5 w-44 min-w-[170px] border-r border-border/60 shadow-sm align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="font-extrabold text-foreground text-xs" translate="no">
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
                      const task = row.days[dayNum];
                      return (
                        <td
                          key={`cell-${row.user_id}-${dayNum}`}
                          className="p-2.5 w-[90px] min-w-[90px] text-center align-middle border-r border-border/25 bg-card/30 hover:bg-card/75 transition-colors"
                        >
                          {renderTaskCell(task, row.worker_name)}
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
