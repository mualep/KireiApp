"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkerDialog } from "@/components/admin/users/create-worker-dialog";
import { EditWorkerDialog } from "@/components/admin/users/edit-worker-dialog";
import { ManageSpDialog } from "@/components/admin/users/manage-sp-dialog";
import { DeactivationDialog } from "@/components/admin/users/deactivation-dialog";
import type { UsersManagerRowDTO } from "@/lib/users/data";
import type { StaffTier } from "@/lib/auth/tiers";
import { cn } from "@/lib/utils";

type UsersTableProps = {
  currentTier: StaffTier;
  rows: UsersManagerRowDTO[];
};

export function UsersTable({ currentTier, rows }: UsersTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UsersManagerRowDTO | null>(null);
  const [manageSpTarget, setManageSpTarget] = useState<UsersManagerRowDTO | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<UsersManagerRowDTO | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>Add Worker</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => (
          <Card key={row.id} className={cn("tracker-glass-panel rounded-2xl border", row.isDeleted && "opacity-50 grayscale")}>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{row.name}</h3>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </div>
                <div className="flex gap-1">
                  {row.isDeleted && <Badge variant="destructive">DEACTIVATED</Badge>}
                  {row.activeSpCount > 0 && <Badge variant="outline" className="text-status-sakit border-status-sakit">SP: {row.activeSpCount}</Badge>}
                  <Badge variant="secondary">{row.tier}</Badge>
                </div>
              </div>
              
              <div className="text-sm grid grid-cols-2 gap-2 text-muted-foreground">
                <div>GID: {row.gid || "-"}</div>
                <div>Role: {row.employeeRole || "-"}</div>
                <div>Shift: {row.shift || "-"}</div>
                <div>Status: {row.status || "-"}</div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setEditTarget(row)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setManageSpTarget(row)}>Manage SP</Button>
                {currentTier === "owner" && (
                  <Button size="sm" variant="outline" onClick={() => setDeactivationTarget(row)}>
                    {row.isDeleted ? "Reactivate" : "Deactivate"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
           <Card className="tracker-glass-panel rounded-2xl border col-span-full">
            <CardContent className="p-6">
              <p className="text-sm font-semibold">No users available.</p>
            </CardContent>
           </Card>
        )}
      </div>

      <CreateWorkerDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editTarget && <EditWorkerDialog row={editTarget} open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} />}
      {manageSpTarget && <ManageSpDialog row={manageSpTarget} open={!!manageSpTarget} onOpenChange={(open) => !open && setManageSpTarget(null)} />}
      {deactivationTarget && <DeactivationDialog row={deactivationTarget} open={!!deactivationTarget} onOpenChange={(open) => !open && setDeactivationTarget(null)} />}
    </div>
  );
}
