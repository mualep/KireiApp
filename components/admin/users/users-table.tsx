"use client";

import { useState, useMemo } from "react";
import { CreateWorkerDialog } from "@/components/admin/users/create-worker-dialog";
import { EditWorkerDialog } from "@/components/admin/users/edit-worker-dialog";
import { ManageSpDialog } from "@/components/admin/users/manage-sp-dialog";
import { DeactivationDialog } from "@/components/admin/users/deactivation-dialog";
import { HardDeleteWorkerDialog } from "@/components/admin/users/hard-delete-worker-dialog";
import type { UsersManagerRowDTO } from "@/lib/users/data";
import {
  PenIcon,
  TriangleAlertIcon,
  UserXIcon,
  ChevronDownIcon,
  XIcon,
  UserPlusIcon,
  UsersIcon,
  OctagonX,
  Trash2,
} from "lucide-react";
import { workerRoles, workerShifts } from "@/lib/workers/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Rhombus SP icons — squares rotated 45deg as per spec
function SpRhombus({ color }: { color: string }) {
  return (
    <span
      className={`inline-block size-2.5 rotate-45 rounded-[2px] ${color}`}
      aria-hidden="true"
    />
  );
}

function SpStatusCell({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted-foreground text-sm">-</span>;
  if (count === 1)
    return (
      <span className="inline-flex items-center gap-0.5" title="SP 1">
        <OctagonX className="size-3.5 text-status-break" aria-hidden="true" />
      </span>
    );
  if (count === 2)
    return (
      <span className="inline-flex items-center gap-0.5" title="SP 2">
        <OctagonX className="size-3.5 text-status-sakit" aria-hidden="true" />
        <OctagonX className="size-3.5 text-status-sakit" aria-hidden="true" />
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5" title="SP 3+">
      <OctagonX className="size-3.5 text-status-alpha" aria-hidden="true" />
      <OctagonX className="size-3.5 text-status-alpha" aria-hidden="true" />
      <OctagonX className="size-3.5 text-status-alpha" aria-hidden="true" />
    </span>
  );
}

function getTierColorClass(tier: string) {
  if (tier === "owner") return "text-status-alpha";
  if (tier === "admin") return "text-status-break";
  return "text-status-cuti";
}

type UsersTableProps = {
  currentTier: string;
  initialData: UsersManagerRowDTO[];
};

export function UsersTable({ initialData, currentTier }: UsersTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<UsersManagerRowDTO | null>(null);
  const [manageSpRow, setManageSpRow] = useState<UsersManagerRowDTO | null>(null);
  const [deactivateRow, setDeactivateRow] = useState<UsersManagerRowDTO | null>(null);
  const [hardDeleteRow, setHardDeleteRow] = useState<UsersManagerRowDTO | null>(null);

  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [spFilter, setSpFilter] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [roleFilter, setRoleFilter] = useState("");

  const filteredData = useMemo(() => {
    let data = [...initialData];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q),
      );
    }
    if (shiftFilter) {
      data = data.filter((d) => d.shift === shiftFilter);
    }
    if (spFilter !== "") {
      const n = Number(spFilter);
      if (n === 0) data = data.filter((d) => d.activeSpCount === 0);
      else if (n === 1) data = data.filter((d) => d.activeSpCount === 1);
      else if (n === 2) data = data.filter((d) => d.activeSpCount === 2);
      else if (n === 3) data = data.filter((d) => d.activeSpCount >= 3);
    }
    if (roleFilter) {
      data = data.filter((d) => d.employeeRole === roleFilter);
    }

    if (sort === "name-asc") data.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name-desc") data.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "sp-desc") data.sort((a, b) => b.activeSpCount - a.activeSpCount);

    return data;
  }, [initialData, search, shiftFilter, spFilter, sort, roleFilter]);

  function clearFilters() {
    setSearch("");
    setShiftFilter("");
    setSpFilter("");
    setRoleFilter("");
    setSort("name-asc");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Topbar Filter — matches tracker-glass-panel pattern */}
      <div className="tracker-glass-panel rounded-xl border p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full h-9 rounded-lg border border-input bg-background/55 px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          {/* Role Filter */}
          <div className="relative w-36">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-9 appearance-none rounded-lg border border-input bg-background/55 px-3 py-1 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Semua Role</option>
              {workerRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          {/* Shift Filter */}
          <div className="relative w-32">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full h-9 appearance-none rounded-lg border border-input bg-background/55 px-3 py-1 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Semua Shift</option>
              {workerShifts.map((s) => (
                <option key={s} value={s}>
                  Shift {s}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          {/* SP Filter */}
          <div className="relative w-32">
            <select
              value={spFilter}
              onChange={(e) => setSpFilter(e.target.value)}
              className="w-full h-9 appearance-none rounded-lg border border-input bg-background/55 px-3 py-1 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Semua SP</option>
              <option value="0">Bebas SP (0)</option>
              <option value="1">SP 1</option>
              <option value="2">SP 2</option>
              <option value="3">SP 3+</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          {/* Clear */}
          {(search || shiftFilter || spFilter || roleFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 gap-1"
            >
              <XIcon className="size-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Right action: Add worker */}
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-9 px-3 font-bold gap-1.5 shrink-0"
        >
          <UserPlusIcon className="size-4" />
          Tambah Worker
        </Button>
      </div>

      {/* Table Section */}
      <div className="tracker-glass-panel rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Worker</th>
                <th className="px-4 py-3 text-center font-medium">Tier</th>
                <th className="px-4 py-3 text-center font-medium">Role</th>
                <th className="px-4 py-3 text-center font-medium">Shift</th>
                <th className="px-4 py-3 text-center font-medium">Status SP</th>
                <th className="px-4 py-3 text-center font-medium">Edit</th>
                <th className="px-4 py-3 text-center font-medium">Manage SP</th>
                {currentTier === "owner" && (
                  <>
                    <th className="px-4 py-3 text-center font-medium">Nonaktif</th>
                    <th className="px-4 py-3 text-center font-medium text-red-400">Hapus Permanen</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredData.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-muted/30 transition-colors ${row.isDeleted ? "opacity-40" : ""}`}
                >
                  {/* Worker: Name + Email, left-aligned */}
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        "font-semibold flex items-center gap-1.5",
                        row.activeSpCount === 1 && "text-status-break",
                        row.activeSpCount === 2 && "text-status-sakit",
                        row.activeSpCount >= 3 && "text-status-alpha",
                        row.activeSpCount === 0 && "text-foreground",
                      )}
                    >
                      <span>{row.name}</span>
                      {row.activeSpCount > 0 && (
                        <OctagonX className="size-3.5 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </td>

                  {/* Tier: styled exactly like profile sidebar */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`block truncate text-[0.65rem] font-semibold uppercase tracking-widest ${getTierColorClass(row.tier)}`}
                    >
                      {row.tier}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {row.employeeRole ?? "-"}
                  </td>

                  {/* Shift */}
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {row.shift ?? "-"}
                  </td>

                  {/* SP Status: rhombus icons */}
                  <td className="px-4 py-3 text-center">
                    <SpStatusCell count={row.activeSpCount} />
                  </td>

                  {/* Edit */}
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditRow(row)}
                      aria-label={`Edit ${row.name}`}
                    >
                      <PenIcon className="size-4" />
                    </Button>
                  </td>

                  {/* Manage SP */}
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setManageSpRow(row)}
                      aria-label={`Manage SP ${row.name}`}
                    >
                      <TriangleAlertIcon className="size-4 text-status-sakit" />
                    </Button>
                  </td>

                  {/* Owner-only actions: Nonaktifkan & Hard Delete */}
                  {currentTier === "owner" && (
                    <>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-amber-400"
                          onClick={() => setDeactivateRow(row)}
                          title={`Nonaktifkan ${row.name}`}
                          aria-label={`Nonaktifkan ${row.name}`}
                        >
                          <UserXIcon className="size-4 text-amber-400" />
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setHardDeleteRow(row)}
                          title={`Hapus Permanen ${row.name}`}
                          aria-label={`Hapus Permanen ${row.name}`}
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={currentTier === "owner" ? 9 : 7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Tidak ada worker yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <CreateWorkerDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editRow && (
        <EditWorkerDialog
          open={!!editRow}
          onOpenChange={(op) => !op && setEditRow(null)}
          row={editRow}
        />
      )}

      {manageSpRow && (
        <ManageSpDialog
          open={!!manageSpRow}
          onOpenChange={(op) => !op && setManageSpRow(null)}
          row={manageSpRow}
        />
      )}

      {deactivateRow && (
        <DeactivationDialog
          open={!!deactivateRow}
          onOpenChange={(op) => !op && setDeactivateRow(null)}
          row={deactivateRow}
        />
      )}

      {hardDeleteRow && (
        <HardDeleteWorkerDialog
          open={!!hardDeleteRow}
          onOpenChange={(op) => !op && setHardDeleteRow(null)}
          row={hardDeleteRow}
        />
      )}
    </div>
  );
}
