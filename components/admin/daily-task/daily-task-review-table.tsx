"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, RefreshCw, Eye, Calendar, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
  status: "draft" | "pending_review" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
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

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/admin/daily-task-review?date=${newDate}`);
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

  function renderProofText(proof: string) {
    if (!proof) return <span className="text-muted-foreground/45 italic">Tidak ada bukti</span>;

    const trimmed = proof.trim();
    if (/^https?:\/\/\S+/i.test(trimmed)) {
      return (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all font-medium inline-flex items-center gap-1.5"
        >
          {trimmed}
        </a>
      );
    }
    return <span className="text-foreground/90 whitespace-pre-wrap">{proof}</span>;
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
      {/* Toolbar / Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/35 shadow-md shadow-primary/2">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">Pilih Tanggal Review:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={isPending}
            className="bg-input-bg border border-input-border text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Total tugas harian hari ini: <span className="font-bold text-foreground">{initialTasks.length}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="tracker-glass-panel rounded-xl border shadow-xl shadow-primary/5">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-4">Worker Name</th>
                <th className="px-5 py-4">Shift</th>
                <th className="px-5 py-4">Game</th>
                <th className="px-5 py-4">Submitted At</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {initialTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground/60 italic">
                    Belum ada pengumpulan tugas harian pada tanggal ini.
                  </td>
                </tr>
              ) : (
                initialTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground" translate="no">
                      {task.worker_name}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="font-sans font-bold text-[11px] border-border bg-muted/40">
                        Shift {task.shift_label.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {task.selected_games.length === 0 ? (
                          <span className="text-muted-foreground/45 italic text-xs">No Game</span>
                        ) : (
                          task.selected_games.map((g) => (
                            <Badge key={g} variant="outline" className="font-semibold text-[10px] border-primary/20 bg-primary/5 text-primary">
                              {g}
                            </Badge>
                          ))
                        )}
                      </div>
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
                          task.status === "draft" && "border-gray-500/35 bg-gray-500/10 text-gray-400"
                        )}
                      >
                        {task.status === "pending_review" ? "pending" : task.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        onClick={() => setSelectedTask(task)}
                        variant="outline"
                        size="sm"
                        className="h-8 border-border bg-background hover:bg-muted text-xs font-bold"
                      >
                        <Eye className="size-3.5 mr-1" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border p-6 md:p-8">
            <DialogHeader className="gap-1.5">
              <DialogTitle>Review Tugas Harian: {selectedTask.worker_name}</DialogTitle>
              <DialogDescription>
                Pengumpulan untuk tanggal {selectedTask.task_date} pada Shift {selectedTask.shift_label.toUpperCase()}
              </DialogDescription>
            </DialogHeader>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-border/20 my-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Stream Name / Link:</span>
                <span className="font-medium text-foreground">
                  {selectedTask.stream_name ? renderProofText(selectedTask.stream_name) : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Reviewer:</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary shrink-0" />
                  {selectedTask.reviewer_name || "-"}
                </span>
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
                          item.game !== "Lainnya" &&
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
                              <span className="text-sm font-semibold text-foreground leading-snug">
                                {item.label}
                              </span>
                            </div>
                            <div className="text-xs max-w-sm w-full sm:w-72 border-l border-border/20 pl-3 py-0.5">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wide mb-1">Bukti:</span>
                              {renderProofText(answer.proof)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dialog Footer Actions */}
            <DialogFooter className="mt-6 pt-4 border-t border-border/20 gap-2">
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
