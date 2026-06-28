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

type ManageSpDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function ManageSpDialog({ onOpenChange, open, row }: ManageSpDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SpLogDTO[]>([]);
  
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
    const formData = new FormData(e.currentTarget);
    const level = Number(formData.get("level"));
    const reason = formData.get("reason") as string;
    
    // Default expiration: 6 months from now
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 6);
    const expiresAt = expiresDate.toISOString();

    const res = await issueSp(row.id, level, reason, expiresAt);
    if (res.ok) {
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
    } else {
      alert(res.error);
    }
    setLoading(false);
  }

  async function onRevokeSp(spId: string) {
    if (!confirm("Are you sure you want to revoke this SP?")) return;
    setLoading(true);
    const res = await revokeSp(spId);
    if (res.ok) {
      const fetchRes = await fetchWorkerSpLogsAction(row.id);
      if (fetchRes.ok && fetchRes.data) setLogs(fetchRes.data);
    } else {
      alert(res.error);
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

        <form onSubmit={onIssueSp} className="flex gap-2 items-end mt-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs">SP Level</label>
            <select name="level" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required>
              <option value="1">SP 1</option>
              <option value="2">SP 2</option>
              <option value="3">SP 3</option>
            </select>
          </div>
          <div className="flex-[3] space-y-2">
            <label className="text-xs">Reason</label>
            <input name="reason" placeholder="Describe the violation" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
          </div>
          <Button type="submit" disabled={loading} variant="destructive">Issue SP</Button>
        </form>

        <div className="mt-6 space-y-4 max-h-[40vh] overflow-y-auto">
          <h4 className="text-sm font-semibold">SP History</h4>
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No SP records found.</p>}
          {logs.map((log) => {
            const isActive = !log.revokedAt && new Date(log.expiresAt) > new Date();
            return (
              <div key={log.id} className={`p-4 border rounded-xl text-sm ${isActive ? "border-status-sakit/50 bg-status-sakit/10" : "opacity-75"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-base">SP {log.spLevel}</span>
                    <Badge variant={isActive ? "destructive" : "secondary"}>
                      {isActive ? "ACTIVE" : (log.revokedAt ? "REVOKED" : "EXPIRED")}
                    </Badge>
                  </div>
                  {isActive && (
                    <Button size="sm" variant="outline" onClick={() => onRevokeSp(log.id)} disabled={loading}>
                      Revoke
                    </Button>
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
