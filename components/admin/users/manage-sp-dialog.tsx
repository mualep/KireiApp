"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TriangleAlertIcon } from "lucide-react";
import { issueSp, revokeSp, fetchWorkerSpLogsAction } from "@/app/admin/(shell)/users/actions";
import type { SpLogDTO, UsersManagerRowDTO } from "@/lib/users/data";

type ManageSpDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function ManageSpDialog({ onOpenChange, open, row }: ManageSpDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SpLogDTO[]>([]);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchWorkerSpLogsAction(row.id).then((res) => {
      if (res.ok && res.data) setLogs(res.data);
    });
  }, [open, row.id]);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setConfirmRevokeId(null);
      setIssueError(null);
      setActionError(null);
    }
    onOpenChange(newOpen);
  }

  async function onIssueSp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setIssueError(null);

    const fd = new FormData(e.currentTarget);
    const reason = fd.get("reason") as string;

    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 6);

    const res = await issueSp(row.id, reason, expiresDate.toISOString());
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
    } else {
      setIssueError(res.error ?? "Gagal memberikan SP");
    }
    setLoading(false);
  }

  async function onConfirmRevoke(spId: string) {
    setLoading(true);
    setActionError(null);
    const res = await revokeSp(spId);
    if (res.ok) {
      setConfirmRevokeId(null);
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
    } else {
      setActionError(res.error ?? "Gagal menghapus SP");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage SP: {row.name}</DialogTitle>
          <DialogDescription>
            Berikan Surat Peringatan (SP) baru atau lihat riwayat SP worker.
          </DialogDescription>
        </DialogHeader>

        {/* Issue SP form */}
        <form onSubmit={onIssueSp} className="flex gap-2 items-end mt-2">
          <div className="flex-1">
            <label htmlFor="sp-reason" className="block text-xs font-medium text-muted-foreground mb-1">
              Alasan / Pelanggaran
            </label>
            <input
              id="sp-reason"
              name="reason"
              placeholder="Jelaskan pelanggaran yang dilakukan"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background/55 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <Button type="submit" disabled={loading} variant="destructive" className="shrink-0">
            <TriangleAlertIcon className="size-4 mr-1.5" />
            Beri SP
          </Button>
        </form>

        {issueError && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {issueError}
          </p>
        )}

        {actionError && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {/* SP History */}
        <div className="mt-4 flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Riwayat SP
          </h4>
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Belum ada catatan SP untuk worker ini.
            </p>
          )}
          {logs.map((log) => {
            const isActive = !log.revokedAt && new Date(log.expiresAt) > new Date();
            const isConfirming = confirmRevokeId === log.id;

            return (
              <div
                key={log.id}
                className={`p-4 border rounded-xl text-sm transition-all ${
                  isActive
                    ? "border-status-sakit/50 bg-status-sakit/5"
                    : "opacity-60 border-border/50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-base">SP {log.spLevel}</span>
                    <Badge variant={isActive ? "destructive" : "secondary"}>
                      {isActive ? "AKTIF" : log.revokedAt ? "DIHAPUS" : "KEDALUWARSA"}
                    </Badge>
                  </div>

                  {isActive && (
                    isConfirming ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground">Yakin hapus SP ini?</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRevokeId(null)}
                          disabled={loading}
                        >
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onConfirmRevoke(log.id)}
                          disabled={loading}
                        >
                          Ya, Hapus
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRevokeId(log.id)}
                        disabled={loading}
                      >
                        Hapus SP
                      </Button>
                    )
                  )}
                </div>

                <p className="text-muted-foreground leading-relaxed">{log.reason}</p>

                <div className="flex justify-between text-xs mt-3 text-muted-foreground/70">
                  <span>Dibuat: {new Date(log.issuedAt).toLocaleDateString("id-ID")}</span>
                  <span>Berakhir: {new Date(log.expiresAt).toLocaleDateString("id-ID")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
