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
import { issueSp, revokeSp, fetchWorkerSpLogsAction } from "@/app/admin/(shell)/users/actions";
import type { SpLogDTO, UsersManagerRowDTO } from "@/lib/users/data";
import { Badge } from "@/components/ui/badge";
import { TriangleAlertIcon } from "lucide-react";

type ManageSpDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function ManageSpDialog({ onOpenChange, open, row }: ManageSpDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SpLogDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchWorkerSpLogsAction(row.id).then((res) => {
        if (res.ok && res.data) setLogs(res.data);
      }).catch(console.error);
    }
  }, [open, row.id]);

  async function onIssueSp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason") as string;

    // Default expiration: 6 months from now
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 6);
    const expiresAt = expiresDate.toISOString();

    const res = await issueSp(row.id, reason, expiresAt);
    if (res.ok) {
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
      (e.target as HTMLFormElement).reset();
    } else {
      setError(res.error || "Unknown error occurred");
    }
    setLoading(false);
  }

  async function onRevokeSp(spId: string) {
    setLoading(true);
    setError(null);
    const res = await revokeSp(spId);
    if (res.ok) {
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
      setConfirmRevokeId(null);
    } else {
      setError(res.error || "Unknown error occurred");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage SP: {row.name}</DialogTitle>
          <DialogDescription>
            Issue a new Surat Peringatan or view the history of SPs.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-sm text-destructive font-medium">{error}</div>}

        <form onSubmit={onIssueSp} className="flex gap-2 items-end mt-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs">Reason</label>
            <input name="reason" placeholder="Describe the violation" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
          </div>
          <Button type="submit" disabled={loading} variant="destructive">
            <TriangleAlertIcon className="size-4 mr-2" />
            Issue SP
          </Button>
        </form>

        <div className="mt-6 space-y-4 max-h-[40vh] overflow-y-auto">
          <h4 className="text-sm font-semibold">SP History</h4>
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No SP records found.</p>}
          {logs.map((log) => {
            const isActive = !log.revokedAt && new Date(log.expiresAt) > new Date();
            const isConfirming = confirmRevokeId === log.id;

            return (
              <div key={log.id} className={`p-4 border rounded-xl text-sm transition-all ${isActive ? "border-status-sakit/50 bg-status-sakit/10" : "opacity-75"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-base">SP {log.spLevel}</span>
                    <Badge variant={isActive ? "destructive" : "secondary"}>
                      {isActive ? "ACTIVE" : (log.revokedAt ? "REVOKED" : "EXPIRED")}
                    </Badge>
                  </div>
                  {isActive && (
                    isConfirming ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setConfirmRevokeId(null)} disabled={loading}>Batal</Button>
                        <Button size="sm" variant="destructive" onClick={() => onRevokeSp(log.id)} disabled={loading}>Ya, Hapus</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmRevokeId(log.id)} disabled={loading}>
                        Hapus SP
                      </Button>
                    )
                  )}
                </div>
                <p className="text-muted-foreground">{log.reason}</p>
                <div className="flex justify-between text-xs mt-3 opacity-60">
                  <span>Issued: {new Date(log.issuedAt).toLocaleDateString()}</span>
                  <span>Expires: {new Date(log.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
