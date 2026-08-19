"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { EnterpriseRuleDTO } from "@/lib/rules/data";
import {
  createEnterpriseRuleAction,
  updateEnterpriseRuleAction,
  deleteEnterpriseRuleAction,
} from "@/app/admin/(shell)/rules/actions";
import { Loader2, Trash2 } from "lucide-react";

type EditRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: EnterpriseRuleDTO | null; // null means create mode
};

export function EditRuleDialog({
  open,
  onOpenChange,
  rule,
}: EditRuleDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(rule?.title || "");
  const [category, setCategory] = useState(rule?.category || "Umum");
  const [sortOrder, setSortOrder] = useState<number>(rule?.sort_order ?? 1);
  const [content, setContent] = useState(rule?.content || "");

  // Update form fields when rule changes
  useState(() => {
    if (rule) {
      setTitle(rule.title);
      setCategory(rule.category || "Umum");
      setSortOrder(rule.sort_order);
      setContent(rule.content);
    } else {
      setTitle("");
      setCategory("Umum");
      setSortOrder(1);
      setContent("");
    }
  });

  const isEdit = Boolean(rule);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Peringatan",
        description: "Judul dan isi peraturan wajib diisi.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      let res;
      if (isEdit && rule) {
        res = await updateEnterpriseRuleAction({
          id: rule.id,
          title,
          content,
          category,
          sort_order: sortOrder,
        });
      } else {
        res = await createEnterpriseRuleAction({
          title,
          content,
          category,
          sort_order: sortOrder,
        });
      }

      if (res.ok) {
        toast({
          title: "Berhasil",
          description: isEdit
            ? "Peraturan berhasil diperbarui."
            : "Peraturan baru berhasil ditambahkan.",
          variant: "success",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Gagal",
          description: res.error || "Gagal menyimpan peraturan.",
          variant: "error",
        });
      }
    });
  }

  function handleDelete() {
    if (!rule) return;
    if (!confirm("Apakah Anda yakin ingin menghapus pasal peraturan ini?")) return;

    startTransition(async () => {
      const res = await deleteEnterpriseRuleAction(rule.id);
      if (res.ok) {
        toast({
          title: "Berhasil",
          description: "Peraturan berhasil dihapus.",
          variant: "success",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Gagal",
          description: res.error || "Gagal menghapus peraturan.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isEdit ? "Edit Pasal Peraturan" : "Tambah Pasal Peraturan Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui teks atau tata tertib peraturan operasional perusahaan."
              : "Tambahkan pasal atau standar operasional baru untuk tim KireiApp."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Judul Pasal / Peraturan
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="contoh: 1. PERATURAN DALAM BEKERJA"
                disabled={isPending}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Kategori
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="contoh: Operasional / Payroll"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Urutan (Sort Order)
            </label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              disabled={isPending}
              className="w-24"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Isi Peraturan & Ketentuan (Mendukung Format Teks Bebas / Poin)
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Tuliskan butir-butir tata tertib..."
              className="font-sans text-xs leading-relaxed"
              disabled={isPending}
              required
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-3 border-t border-border/40">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="size-4" />
                Hapus
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isPending}
                className="min-w-[90px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
