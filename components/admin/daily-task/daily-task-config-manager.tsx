"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfigItem {
  id: string;
  game: string;
  phase: "before_work" | "while_work" | "after_work";
  sort_order: number;
  label: string;
  is_active: boolean;
}

export function DailyTaskConfigManager() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog & Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);

  const [game, setGame] = useState("");
  const [phase, setPhase] = useState<"before_work" | "while_work" | "after_work">("while_work");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch configs
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/daily-task-config");
      const result = await res.json();
      if (result.success) {
        setConfigs(result.data || []);
      } else {
        toast({
          variant: "destructive",
          title: "Gagal memuat konfigurasi",
          description: result.error || "Terjadi kesalahan pada server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal memuat konfigurasi",
        description: "Gagal menghubungi server.",
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchConfigs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchConfigs]);

  const openAddDialog = () => {
    setEditingItem(null);
    setGame("Lainnya");
    setPhase("while_work");
    setSortOrder(configs.length > 0 ? Math.max(...configs.map(c => c.sort_order)) + 1 : 1);
    setLabel("");
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ConfigItem) => {
    setEditingItem(item);
    setGame(item.game);
    setPhase(item.phase);
    setSortOrder(item.sort_order);
    setLabel(item.label);
    setIsActive(item.is_active);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game.trim() || !label.trim()) {
      toast({
        variant: "destructive",
        title: "Input Tidak Valid",
        description: "Nama game dan label deskripsi tidak boleh kosong.",
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          game: game.trim(),
          phase,
          sort_order: sortOrder,
          label: label.trim(),
          is_active: isActive,
        };

        const endpoint = editingItem ? `/api/daily-task-config/${editingItem.id}` : "/api/daily-task-config";
        const method = editingItem ? "PATCH" : "POST";

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (result.success) {
          toast({
            title: editingItem ? "Konfigurasi Diperbarui" : "Konfigurasi Ditambahkan",
            description: "Template checklist harian berhasil disimpan.",
            className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
          });
          setIsDialogOpen(false);
          await fetchConfigs();
        } else {
          toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: result.error || "Terjadi kesalahan pada server.",
            className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan",
          description: "Gagal menghubungi server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konfigurasi task ini?")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/daily-task-config/${id}`, {
          method: "DELETE",
        });

        const result = await res.json();
        if (result.success) {
          toast({
            title: "Konfigurasi Dihapus",
            description: "Template checklist harian berhasil dihapus.",
            className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
          });
          await fetchConfigs();
        } else {
          toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: result.error || "Terjadi kesalahan pada server.",
            className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Gagal Menghapus",
          description: "Gagal menghubungi server.",
          className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
        });
      }
    });
  };

  const phaseLabels: Record<string, string> = {
    before_work: "Before Work",
    while_work: "While Work",
    after_work: "After Work",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action block */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Total task terdaftar: <span className="font-bold text-foreground">{configs.length}</span>
        </div>
        <Button onClick={openAddDialog} className="h-10 px-4 font-bold bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2">
          <Plus className="size-4" />
          Tambah Task
        </Button>
      </div>

      {/* Skeletons or Content list */}
      {loading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card/25 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 w-full gap-2.5 flex flex-col">
                <Skeleton className="h-4 w-1/4 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <Card className="tracker-glass-panel rounded-xl border p-12 text-center text-muted-foreground/60 italic">
          Belum ada konfigurasi task terdaftar. Tekan &ldquo;Tambah Task&rdquo; untuk membuat template baru.
        </Card>
      ) : (
        <Card className="tracker-glass-panel rounded-xl border shadow-xl shadow-primary/5">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-4 w-28">Phase</th>
                  <th className="px-5 py-4 w-36">Game / Category</th>
                  <th className="px-5 py-4 w-20 text-center">Sort</th>
                  <th className="px-5 py-4">Instruksi Checklist</th>
                  <th className="px-5 py-4 w-24 text-center">Status</th>
                  <th className="px-5 py-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-sm">
                {configs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold text-[10px] uppercase tracking-wide",
                          item.phase === "before_work" && "border-blue-500/35 bg-blue-500/10 text-blue-400",
                          item.phase === "while_work" && "border-primary/35 bg-primary/10 text-primary",
                          item.phase === "after_work" && "border-green-500/35 bg-green-500/10 text-green-400"
                        )}
                      >
                        {phaseLabels[item.phase]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-bold text-foreground">
                      {item.game}
                    </td>
                    <td className="px-5 py-4 text-center tabular-nums font-medium">
                      {item.sort_order}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground max-w-sm break-words whitespace-normal overflow-hidden" translate="no">
                      {item.label}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold text-[10px] uppercase h-6 px-2.5 tracking-wider",
                          item.is_active
                            ? "border-green-500/35 bg-green-500/10 text-green-400"
                            : "border-gray-500/35 bg-gray-500/10 text-gray-400"
                        )}
                      >
                        {item.is_active ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => openEditDialog(item)}
                          variant="outline"
                          size="icon-sm"
                          disabled={isPending}
                          className="h-8 w-8 border-border bg-background hover:bg-muted text-foreground"
                          title="Edit Task"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(item.id)}
                          variant="outline"
                          size="icon-sm"
                          disabled={isPending}
                          className="h-8 w-8 border-red-500/20 bg-background hover:bg-red-500/10 text-red-500 hover:text-red-400"
                          title="Hapus Task"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
        <DialogContent className="max-w-xl w-[95vw] sm:w-[90vw] rounded-xl border p-6 md:p-8">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Konfigurasi Task" : "Tambah Konfigurasi Task"}
            </DialogTitle>
            <DialogDescription>
              Tentukan target game, fase pengerjaan, instruksi label, dan prioritas urutan tampil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-5 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-game" className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Game / Category
                </label>
                <input
                  id="modal-game"
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="e.g. Maple Story, Black Desert, Lainnya"
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background/55 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-phase" className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Phase
                </label>
                <select
                  id="modal-phase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as "before_work" | "while_work" | "after_work")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background/55 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3"
                >
                  <option value="before_work">Before Work</option>
                  <option value="while_work">While Work</option>
                  <option value="after_work">After Work</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-sort" className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Sort Order
                </label>
                <input
                  id="modal-sort"
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background/55 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex items-center gap-2 mt-5">
                <input
                  id="modal-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-5 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-2"
                />
                <label htmlFor="modal-active" className="font-semibold text-foreground cursor-pointer select-none">
                  Aktifkan Checklist
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-label" className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Instruksi Task
              </label>
              <textarea
                id="modal-label"
                rows={3}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Tulis instruksi checklist harian yang harus diselesaikan pemain..."
                required
                className="flex w-full rounded-lg border border-input bg-background/55 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
                className="font-bold h-10"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2"
              >
                {isPending && <RefreshCw className="size-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
