"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { submitKompensasiAction, deleteKompensasiAction } from "@/app/admin/(shell)/daily-task-review/actions";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  CalendarDays as CalendarDaysIcon,
  Search,
  FileSpreadsheet,
  ListTodo,
  Scale,
  Check,
  X,
  RefreshCw,
  UserCheck,
  Loader2,
  Edit3,
  Trash2,
} from "lucide-react";
import type {
  MonthlyKompensasiItem,
  MonthlyReportData,
  MonthlyTaskDTO,
} from "@/lib/daily-task/monthly-data";
import { cn } from "@/lib/utils";

interface DailyTaskMonthlyClientShellProps {
  data: MonthlyReportData;
  isMemberMode?: boolean;
  basePath: string; // "/admin/daily-task-review" or "/admin/daily-task"
}

const DAY_NAMES_IND = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function DailyTaskMonthlyClientShell({
  data,
  isMemberMode = false,
  basePath,
}: DailyTaskMonthlyClientShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");

  // State for interactive report dialog
  const [selectedTask, setSelectedTask] = useState<MonthlyTaskDTO | null>(null);

  // Kompensasi Form State inside dialog
  const [showKompenForm, setShowKompenForm] = useState(false);
  const [editingKompenId, setEditingKompenId] = useState<string | null>(null);
  const [kompenHours, setKompenHours] = useState<number | "">("");
  const [kompenMinutes, setKompenMinutes] = useState<number | "">("");
  const [kompenReason, setKompenReason] = useState("");
  const [kompenProofUrl, setKompenProofUrl] = useState("");
  const [showDurationError, setShowDurationError] = useState(false);
  const [isSubmittingKompen, setIsSubmittingKompen] = useState(false);
  const [isDeletingKompenId, setIsDeletingKompenId] = useState<string | null>(null);
  const [kompenToDelete, setKompenToDelete] = useState<MonthlyKompensasiItem | null>(null);

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

  const handleOpenCreateKompen = () => {
    setEditingKompenId(null);
    setKompenHours("");
    setKompenMinutes("");
    setKompenReason("");
    setKompenProofUrl("");
    setShowDurationError(false);
    setShowKompenForm(true);
  };

  const handleOpenEditKompen = (k: MonthlyKompensasiItem) => {
    setEditingKompenId(k.id);
    const h = Math.floor(k.duration_minutes / 60);
    const m = k.duration_minutes % 60;
    setKompenHours(h > 0 ? h : "");
    setKompenMinutes(m > 0 ? m : "");
    setKompenReason(k.reason);
    setKompenProofUrl(k.proof_url || "");
    setShowDurationError(false);
    setShowKompenForm(true);
  };

  const confirmDeleteKompensasi = async () => {
    if (!kompenToDelete || !selectedTask) return;
    const k = kompenToDelete;
    setIsDeletingKompenId(k.id);
    try {
      const res = await deleteKompensasiAction(k.id, selectedTask.user_id);
      if (res.ok) {
        toast({
          title: "Kompensasi Dihapus",
          description: "Data kompensasi berhasil dihapus dan dipotong dari Records.",
          className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
        });
        if (editingKompenId === k.id) {
          setShowKompenForm(false);
          setEditingKompenId(null);
        }
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Gagal Menghapus Kompensasi",
          description: res.error || "Terjadi kesalahan pada server.",
        });
      }
    } finally {
      setIsDeletingKompenId(null);
      setKompenToDelete(null);
    }
  };

  const handleKompensasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const h = Number(kompenHours) || 0;
    const m = Number(kompenMinutes) || 0;
    const totalMins = h * 60 + m;

    if (totalMins <= 0) {
      setShowDurationError(true);
      return;
    }
    setShowDurationError(false);

    if (!kompenReason.trim()) {
      toast({
        variant: "destructive",
        title: "Alasan Wajib Diisi",
        description: "Silakan masukkan alasan atau detail kesalahan kompensasi.",
      });
      return;
    }

    setIsSubmittingKompen(true);
    try {
      const res = await submitKompensasiAction({
        id: editingKompenId,
        userId: selectedTask.user_id,
        dailyTaskId: selectedTask.id,
        taskDate: selectedTask.task_date,
        hours: h,
        minutes: m,
        reason: kompenReason,
        proofUrl: kompenProofUrl,
      });

      if (res.ok && typeof res.durationMinutes === "number") {
        const hFormatted = Math.floor(res.durationMinutes / 60);
        const mFormatted = res.durationMinutes % 60;
        const formattedDuration = `${hFormatted}h ${mFormatted}m`;

        toast({
          title: editingKompenId ? "Kompensasi Diperbarui" : "Kompensasi Berhasil Diberikan",
          description: `Kompensasi ${formattedDuration} berhasil disimpan & disinkronkan ke Records.`,
          className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
        });
        setShowKompenForm(false);
        setEditingKompenId(null);
        setKompenHours("");
        setKompenMinutes("");
        setKompenReason("");
        setKompenProofUrl("");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan Kompensasi",
          description: res.error || "Terjadi kesalahan pada server.",
        });
      }
    } finally {
      setIsSubmittingKompen(false);
    }
  };

  const handleReviewStatus = async (taskId: string, status: "approved" | "rejected") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/daily-task/${taskId}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const result = await res.json();
        if (result.success) {
          toast({
            title: status === "approved" ? "Tugas Disetujui" : "Tugas Ditolak",
            description: `Tugas harian berhasil diubah statusnya menjadi ${status}.`,
            className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
          });
          setSelectedTask(null);
          router.refresh();
        } else {
          toast({
            variant: "destructive",
            title: "Gagal Mengubah Status",
            description: result.error || "Terjadi kesalahan pada server.",
            className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Gagal Mengubah Status",
          description: "Gagal menghubungi server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    });
  };

  // Filter rows
  const filteredRows = rows.filter((row) => {
    if (shiftFilter !== "all" && row.shift.toLowerCase() !== shiftFilter.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const workerMatch = row.worker_name.toLowerCase().includes(q);

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

  const renderProofText = (proof: string | null | undefined) => {
    if (!proof || !proof.trim()) return <span className="text-muted-foreground/45 italic">-</span>;

    const tokens = proof.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <span className="text-muted-foreground/45 italic">-</span>;

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
                onClick={() => setSelectedTask({ ...task, worker_name: workerName })}
                className={cn(
                  "inline-flex items-center justify-center px-1.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer",
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

    // Always show '-' if no daily task is submitted (do NOT fallback to attendance H/C/S/P/A)
    return <span className="text-muted-foreground/30 font-semibold text-xs">-</span>;
  };

  const memberRow = rows[0] || null;

  return (
    <div className="flex flex-col gap-6">
      {/* View Switcher & Toolbar */}
      <Card className="tracker-glass-panel rounded-xl border p-4 shadow-xs">
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* View Switcher Tabs (Daily vs Monthly) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Tampilan:</span>
              <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50">
                <Link
                  href={`${basePath}?view=daily`}
                  className={cn(
                    "h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    searchParams.get("view") !== "monthly"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListTodo className="size-3.5" />
                  {isMemberMode ? "Formulir Hari Ini" : "Harian"}
                </Link>
                <Link
                  href={`${basePath}?view=monthly&month=${monthParam}`}
                  className={cn(
                    "h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    searchParams.get("view") === "monthly"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileSpreadsheet className="size-3.5" />
                  {isMemberMode ? "Laporan Bulanan" : "Bulanan"}
                </Link>
              </div>
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
        <Card className="tracker-glass-panel rounded-2xl border shadow-xs">
          <div className="flex items-center justify-between border-b border-border/75 px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handlePrevMonth}
                disabled={isPending}
                aria-label="Previous Month"
                className="size-7 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 px-1">
                <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary" />
                <h2 className="truncate text-sm font-bold">{monthName} {year}</h2>
                {isPending && <Loader2 className="size-3.5 animate-spin text-primary ml-1" />}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleNextMonth}
                disabled={isPending}
                aria-label="Next Month"
                className="size-7 rounded-lg cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </Button>
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
                const isToday = dayNum === todayDayNum;

                return (
                  <div
                    key={`mday-${dayNum}`}
                    className={cn(
                      "h-16 rounded-xl border relative flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all p-1 bg-card/60 border-border/60",
                      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  >
                    <span className="text-xs font-bold leading-none">{dayNum}</span>
                    <div className="flex items-center justify-center">
                      {renderCellContent(tasks, memberRow?.worker_name || "Pemain")}
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
        <Card
          className={cn(
            "tracker-glass-panel rounded-2xl border shadow-xs overflow-hidden transition-opacity duration-200",
            isPending && "opacity-60 pointer-events-none"
          )}
        >
          {/* Table Header matching Absensi and Records exact component */}
          <div className="flex items-center justify-between gap-3 border-b border-border/75 px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handlePrevMonth}
                disabled={isPending}
                aria-label="Previous Month"
                className="size-7 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 px-1">
                <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary" />
                <h2 className="truncate text-sm font-bold">{monthName} {year}</h2>
                {isPending && <Loader2 className="size-3.5 animate-spin text-primary ml-1" />}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleNextMonth}
                disabled={isPending}
                aria-label="Next Month"
                className="size-7 rounded-lg cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Horizontally Scrollable Compact Matrix Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs border-spacing-0">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-bold">
                  {/* Sticky Left Column: Worker Header */}
                  <th className="sticky left-0 z-30 bg-muted/90 backdrop-blur-md p-3 w-48 min-w-[190px] border-r border-border/60 shadow-xs">
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
                      <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-md p-3 w-48 min-w-[190px] border-r border-border/60 shadow-xs align-middle">
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
                        return (
                          <td
                            key={`cell-${row.user_id}-${dayNum}`}
                            className="w-12 min-w-[48px] p-2 text-center align-middle border-r border-border/25 bg-card/30 hover:bg-card/75 transition-colors"
                          >
                            {renderCellContent(tasks, row.worker_name)}
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

      {/* ------------------------------------------------------------- */}
      {/* 1:1 REVIEW DIALOG (EXACTLY IDENTICAL WITH DAILY REVIEW DIALOG) */}
      {/* ------------------------------------------------------------- */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border p-6 md:p-8">
            <DialogHeader className="gap-1.5">
              <DialogTitle>Review Laporan Tugas (Employee Report): {selectedTask.worker_name || "Pemain"}</DialogTitle>
              <DialogDescription>
                Pengumpulan untuk tanggal {selectedTask.task_date} pada Shift {selectedTask.shift_label?.toUpperCase() || "A"}
              </DialogDescription>
            </DialogHeader>

            {/* General Info / Employee Report Header Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-border/20 my-4 text-sm">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Nama Buyer:</span>
                    <span className="font-bold text-foreground">{selectedTask.buyer_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Reviewer:</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <UserCheck className="size-4 text-primary shrink-0" />
                      {selectedTask.reviewer_name || "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Keterangan Task:</span>
                  <span className="font-medium text-foreground">{selectedTask.task_description || "-"}</span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Link Streaming:</span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderProofText(selectedTask.stream_name)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Problem / Kendala:</span>
                  <span className="font-medium text-amber-500">{selectedTask.problem_notes || "-"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-border/20 pt-3 md:pt-0 md:pl-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Jam SS Before:</span>
                    <span className="font-bold text-foreground">{selectedTask.ss_before_time ? selectedTask.ss_before_time.slice(0, 5) : "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Jam SS After:</span>
                    <span className="font-bold text-foreground">{selectedTask.ss_after_time ? selectedTask.ss_after_time.slice(0, 5) : "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Total Durasi:</span>
                    <span className="font-bold text-foreground">
                      {typeof selectedTask.process_duration_minutes === "number"
                        ? `${selectedTask.process_duration_minutes}m`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Link SS Before:</span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderProofText(selectedTask.ss_before_url)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Link SS After:</span>
                  <span className="font-medium text-foreground break-all whitespace-normal block">
                    {renderProofText(selectedTask.ss_after_url)}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-xs font-semibold">Pilihan Game:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(!selectedTask.selected_games || selectedTask.selected_games.length === 0) ? (
                      <span className="text-muted-foreground/50 italic text-xs">-</span>
                    ) : (
                      selectedTask.selected_games.map((g) => (
                        <Badge key={g} variant="outline" className="font-semibold text-[10px] border-primary/20 bg-primary/5 text-primary">
                          {g}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Details */}
            {selectedTask.checklist_snapshot && selectedTask.checklist_snapshot.length > 0 && (
              <div className="flex flex-col gap-5 py-2">
                {["before_work", "while_work", "after_work"].map((phase) => {
                  const phaseItems = (selectedTask.checklist_snapshot || []).filter((i) => i.phase === phase);
                  if (phaseItems.length === 0) return null;

                  const phaseLabels: Record<string, string> = {
                    before_work: "Before Work",
                    while_work: "While Work",
                    after_work: "After Work",
                  };

                  return (
                    <div key={phase} className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                        {phaseLabels[phase]}
                      </h4>
                      <div className="flex flex-col gap-3">
                        {phaseItems.map((item) => {
                          if (
                            phase === "while_work" &&
                            !selectedTask.selected_games?.includes(item.game)
                          ) {
                            return null;
                          }

                          const answer = (selectedTask.checklist_answers || {})[item.id] || { checked: false, proof: "" };
                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-xl border border-border/20 bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {answer.checked ? (
                                    <Check className="size-4 text-green-500 font-extrabold" />
                                  ) : (
                                    <X className="size-4 text-red-500 font-extrabold" />
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-foreground leading-snug break-words whitespace-normal overflow-hidden">
                                  {item.label}
                                </span>
                              </div>
                              <div className="text-xs max-w-sm w-full sm:w-80 border-l border-border/20 pl-3 py-0.5 break-words whitespace-normal overflow-hidden">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wide mb-1">Bukti:</span>
                                <div className="break-all whitespace-normal overflow-hidden">
                                  {renderProofText(answer.proof)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Existing Kompensasi List */}
            {selectedTask.kompensasi && selectedTask.kompensasi.length > 0 && (
              <div className="flex flex-col gap-3 py-3 border-t border-border/20 mt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Scale className="size-4" />
                  <span>Daftar Kompensasi Kelalaian Kerja ({selectedTask.kompensasi.length})</span>
                </h4>
                <div className="flex flex-col gap-2.5">
                  {selectedTask.kompensasi.map((k) => {
                    const h = Math.floor(k.duration_minutes / 60);
                    const m = k.duration_minutes % 60;
                    return (
                      <div
                        key={k.id}
                        className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                              {h}h {m}m
                            </Badge>
                            <span className="text-xs font-bold text-foreground">
                              {k.reason}
                            </span>
                          </div>
                          {k.proof_url ? (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground/70 mr-1.5">Bukti:</span>
                              {renderProofText(k.proof_url)}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditKompen(k)}
                            disabled={isDeletingKompenId === k.id}
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1"
                          >
                            <Edit3 className="size-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setKompenToDelete(k)}
                            disabled={isDeletingKompenId === k.id}
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                          >
                            {isDeletingKompenId === k.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            <span>Hapus</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kompensasi Form (Create / Edit) */}
            {showKompenForm && (
              <form
                onSubmit={handleKompensasiSubmit}
                className="p-4 md:p-5 rounded-xl border border-border/70 bg-card/80 mt-4 flex flex-col gap-4 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2 text-xs font-black text-foreground uppercase tracking-wide">
                    <Scale className="size-4 text-amber-500" />
                    <span>
                      {editingKompenId ? "EDIT KOMPENSASI UNTUK" : "BERI KOMPENSASI UNTUK"}{" "}
                      {(selectedTask.worker_name || "Pemain").toUpperCase()}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowKompenForm(false);
                      setEditingKompenId(null);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Tutup
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Durasi Jam</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={kompenHours}
                      onChange={(e) => {
                        setKompenHours(e.target.value === "" ? "" : Number(e.target.value));
                        setShowDurationError(false);
                      }}
                      className="h-9 text-xs bg-background/80"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Durasi Menit</label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="0"
                      value={kompenMinutes}
                      onChange={(e) => {
                        setKompenMinutes(e.target.value === "" ? "" : Number(e.target.value));
                        setShowDurationError(false);
                      }}
                      className="h-9 text-xs bg-background/80"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      Link Bukti Foto (opsional)
                    </label>
                    <Input
                      placeholder="https://imgpile.com/p/... (opsional)"
                      value={kompenProofUrl}
                      onChange={(e) => setKompenProofUrl(e.target.value)}
                      className="h-9 text-xs bg-background/80"
                    />
                  </div>
                </div>

                {showDurationError && (
                  <span className="text-red-500 text-[11px] font-bold">
                    *Durasi wajib diisi (minimal 1 menit)
                  </span>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-muted-foreground">
                    Alasan / Kesalahan Kompensasi *
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="contoh: Grinding salah spot / Kelalaian crystal pecah / Salah map"
                    value={kompenReason}
                    onChange={(e) => setKompenReason(e.target.value)}
                    className="text-xs bg-background/80"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowKompenForm(false);
                      setEditingKompenId(null);
                    }}
                    disabled={isSubmittingKompen}
                    className="h-9 text-xs font-bold px-4"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingKompen}
                    className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white min-w-[130px]"
                  >
                    {isSubmittingKompen ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Menyimpan...
                      </>
                    ) : (
                      editingKompenId ? "Simpan Perubahan" : "Kirim Kompensasi"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Dialog Footer Actions */}
            <DialogFooter className="mt-6 pt-4 border-t border-border/20 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!showKompenForm && (!selectedTask.kompensasi || selectedTask.kompensasi.length === 0) && (
                  <Button
                    type="button"
                    onClick={handleOpenCreateKompen}
                    className="bg-amber-600 text-white hover:bg-amber-700 font-bold h-10 gap-1.5 px-4 shadow-sm cursor-pointer"
                  >
                    <Scale className="size-4" />
                    <span>Beri Kompensasi</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  disabled={isPending}
                  className="font-bold h-10 cursor-pointer"
                >
                  Batal
                </Button>
                
                <Button
                  onClick={() => handleReviewStatus(selectedTask.id, "rejected")}
                  disabled={isPending}
                  className="bg-red-600 text-white hover:bg-red-700 font-bold h-10 gap-1.5 cursor-pointer"
                >
                  {isPending ? <RefreshCw className="size-4 animate-spin" /> : <X className="size-4" />}
                  Reject
                </Button>

                <Button
                  onClick={() => handleReviewStatus(selectedTask.id, "approved")}
                  disabled={isPending}
                  className="bg-green-600 text-white hover:bg-green-700 font-bold h-10 gap-1.5 cursor-pointer"
                >
                  {isPending ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Approve
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Kompensasi Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!kompenToDelete}
        onOpenChange={(open) => {
          if (!open && isDeletingKompenId === null) {
            setKompenToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <span>Hapus Catatan Kompensasi?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground pt-1">
              Apakah Anda yakin ingin menghapus kompensasi sebesar{" "}
              <span className="font-bold text-foreground">
                {kompenToDelete
                  ? `${Math.floor(kompenToDelete.duration_minutes / 60)}h ${kompenToDelete.duration_minutes % 60}m`
                  : ""}
              </span>{" "}
              untuk <span className="font-bold text-foreground">{selectedTask?.worker_name || "Pemain"}</span>?
              <br /><br />
              Tindakan ini akan secara otomatis memotong akumulasi kompensasi pekerja pada Records bulan berjalan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeletingKompenId !== null}
              onClick={() => setKompenToDelete(null)}
              className="h-9 text-xs font-bold"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingKompenId !== null}
              onClick={confirmDeleteKompensasi}
              className="h-9 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white min-w-[120px]"
            >
              {isDeletingKompenId !== null ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Menghapus...
                </>
              ) : (
                "Hapus Kompensasi"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
