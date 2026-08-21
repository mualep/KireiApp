"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitKompensasiAction, deleteKompensasiAction } from "@/app/admin/(shell)/daily-task-review/actions";
import { Check, X, RefreshCw, Eye, Calendar, UserCheck, ChevronDown, ExternalLink, ListTodo, FileSpreadsheet, Scale, Loader2, AlertCircle, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KompensasiItem {
  id: string;
  user_id: string;
  daily_task_id?: string | null;
  date: string;
  duration_minutes: number;
  reason: string;
  proof_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaskRecord {
  id: string;
  user_id: string;
  worker_name: string;
  task_date: string;
  shift_label: string;
  stream_name: string | null;
  selected_games: string[];
  checklist_snapshot: Array<{
    id: string;
    game: string;
    phase: "before_work" | "while_work" | "after_work";
    sort_order: number;
    label: string;
  }>;
  checklist_answers: Record<string, { checked: boolean; proof: string }>;
  status: "draft" | "pending_review" | "approved" | "rejected" | "belum_mengisi";
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  ss_before_time: string | null;
  ss_after_time: string | null;
  process_duration_minutes: number | null;
  buyer_name?: string | null;
  task_description?: string | null;
  problem_notes?: string | null;
  ss_before_url?: string | null;
  ss_after_url?: string | null;
  kompensasi?: KompensasiItem[];
}

interface DailyTaskReviewTableProps {
  initialTasks: TaskRecord[];
  selectedDate: string;
}

export function DailyTaskReviewTable({
  initialTasks,
  selectedDate,
}: DailyTaskReviewTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(selectedDate);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Kompensasi Form State
  const [showKompenForm, setShowKompenForm] = useState(false);
  const [editingKompenId, setEditingKompenId] = useState<string | null>(null);
  const [kompenHours, setKompenHours] = useState<number | "">("");
  const [kompenMinutes, setKompenMinutes] = useState<number | "">("");
  const [kompenReason, setKompenReason] = useState("");
  const [kompenProofUrl, setKompenProofUrl] = useState("");
  const [showDurationError, setShowDurationError] = useState(false);
  const [isSubmittingKompen, setIsSubmittingKompen] = useState(false);
  const [isDeletingKompenId, setIsDeletingKompenId] = useState<string | null>(null);
  const [kompenToDelete, setKompenToDelete] = useState<KompensasiItem | null>(null);

  const handleOpenCreateKompen = () => {
    setEditingKompenId(null);
    setKompenHours("");
    setKompenMinutes("");
    setKompenReason("");
    setKompenProofUrl("");
    setShowDurationError(false);
    setShowKompenForm(true);
  };

  const handleOpenEditKompen = (k: KompensasiItem) => {
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
        dailyTaskId: selectedTask.id.startsWith("placeholder-") ? null : selectedTask.id,
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

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/admin/daily-task-review?date=${newDate}`);
  };

  const filteredTasks = initialTasks
    .filter((task) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const workerMatch = task.worker_name.toLowerCase().includes(query);
        const buyerMatch = task.buyer_name?.toLowerCase().includes(query) ?? false;
        const descMatch = task.task_description?.toLowerCase().includes(query) ?? false;
        if (!workerMatch && !buyerMatch && !descMatch) {
          return false;
        }
      }
      if (shiftFilter !== "all") {
        if (task.shift_label.toLowerCase() !== shiftFilter.toLowerCase()) {
          return false;
        }
      }
      if (statusFilter !== "all") {
        if (task.status !== statusFilter) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.worker_name.localeCompare(b.worker_name);
      }
      if (sortBy === "name_desc") {
        return b.worker_name.localeCompare(a.worker_name);
      }
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

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

  function renderProofText(proof: string | null | undefined) {
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
                className="text-primary hover:underline break-all font-medium inline-flex items-center gap-1.5"
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
  }

  function formatTime(isoString: string | null) {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar / Filters */}
      <Card className="tracker-glass-panel rounded-xl border p-4 shadow-xs">
        <CardContent className="p-0 flex flex-col gap-4">
          {/* View Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Tampilan:</span>
              <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50">
                <Link
                  href="/admin/daily-task-review?view=daily"
                  className="h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-primary text-primary-foreground shadow-xs"
                >
                  <ListTodo className="size-3.5" />
                  Harian
                </Link>
                <Link
                  href="/admin/daily-task-review?view=monthly"
                  className="h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <FileSpreadsheet className="size-3.5" />
                  Bulanan
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="grid flex-1 gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
              {/* Search */}
              <div role="group" className="flex flex-col">
                <label htmlFor="review-search" className="sr-only">
                  Cari Nama / Buyer
                </label>
                <input
                  id="review-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pekerja / buyer..."
                  autoComplete="off"
                  className="w-full min-w-0 rounded-lg border border-input px-3 py-1.5 text-sm h-10 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              {/* Shift Filter */}
              <div role="group" className="relative flex flex-col">
                <label htmlFor="review-shift" className="sr-only">
                  Filter Shift
                </label>
                <select
                  id="review-shift"
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input px-3 py-1.5 pr-9 text-sm h-10 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="all">Semua Shift</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="flexible">Flexible</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              </div>

              {/* Status Filter */}
              <div role="group" className="relative flex flex-col">
                <label htmlFor="review-status" className="sr-only">
                  Filter Status
                </label>
                <select
                  id="review-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input px-3 py-1.5 pr-9 text-sm h-10 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="all">Semua Status</option>
                  <option value="belum_mengisi">Belum Mengisi</option>
                  <option value="pending_review">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              </div>

              {/* Sort By */}
              <div role="group" className="relative flex flex-col">
                <label htmlFor="review-sort" className="sr-only">
                  Urutan
                </label>
                <select
                  id="review-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input px-3 py-1.5 pr-9 text-sm h-10 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="name_asc">Nama A-Z</option>
                  <option value="name_desc">Nama Z-A</option>
                  <option value="status">Status</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              </div>

              {/* Date Picker */}
              <div role="group" className="relative flex items-center">
                <Calendar className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-input pl-9 pr-3 py-1.5 text-sm h-10 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground shrink-0 text-right">
              Menampilkan <span className="font-bold text-foreground">{filteredTasks.length}</span> dari{" "}
              <span className="font-bold text-foreground">{initialTasks.length}</span> pekerja
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="tracker-glass-panel rounded-xl border shadow-xl shadow-primary/5">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-4">Nama Pekerja</th>
                <th className="px-5 py-4">Shift</th>
                <th className="px-5 py-4">Buyer & Task</th>
                <th className="px-5 py-4">Link Stream</th>
                <th className="px-5 py-4">Submitted At</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground/60 italic">
                    Tidak ada data pengumpulan tugas harian yang cocok dengan kriteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isPlaceholder = task.status === "belum_mengisi";
                  return (
                    <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-4 font-bold text-foreground" translate="no">
                        {task.worker_name}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="font-sans font-bold text-[11px] border-border bg-muted/40">
                          Shift {task.shift_label.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-foreground truncate" title={task.buyer_name || undefined}>
                            {task.buyer_name ? `Buyer: ${task.buyer_name}` : <span className="text-muted-foreground/50 italic text-xs">No Buyer</span>}
                          </span>
                          {task.task_description ? (
                            <span className="text-xs text-muted-foreground truncate" title={task.task_description}>
                              {task.task_description}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        {task.stream_name ? (
                          renderProofText(task.stream_name)
                        ) : (
                          <span className="text-muted-foreground/45 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-muted-foreground">
                        {formatTime(task.submitted_at)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[11px] px-2.5 h-6 uppercase tracking-wider",
                            task.status === "approved" && "border-green-500/35 bg-green-500/10 text-green-400",
                            task.status === "rejected" && "border-red-500/35 bg-red-500/10 text-red-400",
                            task.status === "pending_review" && "border-yellow-500/35 bg-yellow-500/10 text-yellow-400",
                            task.status === "draft" && "border-gray-500/35 bg-gray-500/10 text-gray-400",
                            task.status === "belum_mengisi" && "border-neutral-500/35 bg-neutral-500/10 text-neutral-400"
                          )}
                        >
                          {task.status === "pending_review" ? "pending" : task.status === "belum_mengisi" ? "belum mengisi" : task.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          onClick={() => setSelectedTask(task)}
                          variant="outline"
                          size="sm"
                          disabled={isPlaceholder}
                          className={cn(
                            "h-8 border-border bg-background hover:bg-muted text-xs font-bold",
                            isPlaceholder && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Eye className="size-3.5 mr-1" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border p-6 md:p-8">
            <DialogHeader className="gap-1.5">
              <DialogTitle>Review Laporan Tugas (Employee Report): {selectedTask.worker_name}</DialogTitle>
              <DialogDescription>
                Pengumpulan untuk tanggal {selectedTask.task_date} pada Shift {selectedTask.shift_label.toUpperCase()}
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
                    {selectedTask.selected_games.length === 0 ? (
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
            <div className="flex flex-col gap-5 py-2">
              {["before_work", "while_work", "after_work"].map((phase) => {
                const phaseItems = selectedTask.checklist_snapshot.filter((i) => i.phase === phase);
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
                          !selectedTask.selected_games.includes(item.game)
                        ) {
                          return null;
                        }

                        const answer = selectedTask.checklist_answers[item.id] || { checked: false, proof: "" };
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
                      {selectedTask.worker_name.toUpperCase()}
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
                    className="bg-amber-600 text-white hover:bg-amber-700 font-bold h-10 gap-1.5 px-4 shadow-sm"
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
                  className="font-bold h-10"
                >
                  Batal
                </Button>
                
                <Button
                  onClick={() => handleReviewStatus(selectedTask.id, "rejected")}
                  disabled={isPending}
                  className="bg-red-600 text-white hover:bg-red-700 font-bold h-10 gap-1.5"
                >
                  {isPending ? <RefreshCw className="size-4 animate-spin" /> : <X className="size-4" />}
                  Reject
                </Button>

                <Button
                  onClick={() => handleReviewStatus(selectedTask.id, "approved")}
                  disabled={isPending}
                  className="bg-green-600 text-white hover:bg-green-700 font-bold h-10 gap-1.5"
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
              untuk <span className="font-bold text-foreground">{selectedTask?.worker_name}</span>?
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
