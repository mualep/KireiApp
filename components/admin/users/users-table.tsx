"use client";

import { useState, useMemo } from "react";
import { CreateWorkerDialog } from "@/components/admin/users/create-worker-dialog";
import { EditWorkerDialog } from "@/components/admin/users/edit-worker-dialog";
import { ManageSpDialog } from "@/components/admin/users/manage-sp-dialog";
import { DeactivationDialog } from "@/components/admin/users/deactivation-dialog";
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
      <div className="tracker-glass-panel flex flex-col gap-0 rounded-xl border py-0">
        <div className="flex flex-col gap-2 p-3">
          {/* Row 1: Search, Shift, SP, Sort, Clear, Add Worker */}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            {/* Search */}
            <div role="group">
              <label className="sr-only" htmlFor="users-search">
                Cari Worker
              </label>
              <input
                id="users-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base h-9 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                placeholder="Cari nama worker…"
                type="search"
                autoComplete="off"
              />
            </div>

            {/* Shift filter */}
            <div role="group" className="relative">
              <label className="sr-only" htmlFor="users-shift">
                Shift
              </label>
              <select
                id="users-shift"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua Shift</option>
                {workerShifts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* SP Status filter */}
            <div role="group" className="relative">
              <label className="sr-only" htmlFor="users-sp">
                Status SP
              </label>
              <select
                id="users-sp"
                value={spFilter}
                onChange={(e) => setSpFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua Status SP</option>
                <option value="0">Tanpa SP</option>
                <option value="1">SP 1</option>
                <option value="2">SP 2</option>
                <option value="3">SP 3</option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Sort */}
            <div role="group" className="relative">
              <label className="sr-only" htmlFor="users-sort">
                Urutkan
              </label>
              <select
                id="users-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="name-asc">Nama → A-Z</option>
                <option value="name-desc">Nama → Z-A</option>
                <option value="sp-desc">SP → Tertinggi</option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Clear */}
            <Button
              variant="outline"
              className="h-9 w-full sm:w-auto px-2.5 gap-1.5 border-border bg-background hover:bg-muted hover:text-foreground"
              onClick={clearFilters}
            >
              <XIcon className="size-4" aria-hidden="true" />
              Bersihkan
            </Button>

            {/* Counter + Add Worker */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 items-center justify-end gap-2 rounded-lg border border-border/75 bg-background/35 px-3 text-xs text-muted-foreground">
                <UsersIcon className="size-4" aria-hidden="true" />
                <span className="font-mono tabular-nums">{filteredData.length}</span>
                <span className="hidden sm:inline">pekerja</span>
              </div>
              <Button
                className="h-9 px-3 gap-1.5 whitespace-nowrap"
                onClick={() => setCreateOpen(true)}
              >
                <UserPlusIcon className="size-4" aria-hidden="true" />
                Tambah Worker
              </Button>
            </div>
          </div>

          {/* Row 2: Role tabs */}
          <nav aria-label="Filter berdasarkan role">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
              <button
                onClick={() => setRoleFilter("")}
                aria-current={roleFilter === "" ? "page" : undefined}
                className={`inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  roleFilter === ""
                    ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20"
                    : "border-border/75 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="truncate">Semua</span>
                <span className="rounded-full border border-current/20 bg-background/45 px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums">
                  {initialData.length}
                </span>
              </button>
              {workerRoles.map((role) => {
                const count = initialData.filter((d) => d.employeeRole === role).length;
                const abbr = role
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase();
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(roleFilter === role ? "" : role)}
                    aria-current={roleFilter === role ? "page" : undefined}
                    title={role}
                    className={`inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                      roleFilter === role
                        ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20"
                        : "border-border/75 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate sm:hidden">{abbr}</span>
                    <span className="hidden truncate sm:inline lg:hidden">{abbr}</span>
                    <span className="hidden truncate lg:inline">{role}</span>
                    <span className="rounded-full border border-current/20 bg-background/45 px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Table */}
      <div className="tracker-glass-panel overflow-hidden rounded-xl border bg-card/75">
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
                  <th className="px-4 py-3 text-center font-medium">Pecat</th>
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

                  {/* Pecat — owner-only */}
                  {currentTier === "owner" && (
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:text-destructive"
                        onClick={() => setDeactivateRow(row)}
                        aria-label={`Pecat ${row.name}`}
                      >
                        <UserXIcon className="size-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={currentTier === "owner" ? 8 : 7}
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
    </div>
  );
}
