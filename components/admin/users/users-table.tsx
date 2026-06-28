"use client";

import { useState, useMemo } from "react";
import { CreateWorkerDialog } from "@/components/admin/users/create-worker-dialog";
import { EditWorkerDialog } from "@/components/admin/users/edit-worker-dialog";
import { ManageSpDialog } from "@/components/admin/users/manage-sp-dialog";
import { DeactivationDialog } from "@/components/admin/users/deactivation-dialog";
import type { UsersManagerRowDTO } from "@/lib/users/data";
import { PenIcon, TriangleAlertIcon, UserXIcon, ChevronDownIcon, XIcon, UserPlusIcon } from "lucide-react";
import { workerRoles, workerShifts } from "@/lib/workers/constants";
import { Button } from "@/components/ui/button";

export function UsersTable({ initialData, currentTier }: { initialData: UsersManagerRowDTO[]; currentTier: string }) {
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
      data = data.filter(d => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
    }
    if (shiftFilter) {
      data = data.filter(d => d.shift === shiftFilter);
    }
    if (spFilter) {
      if (spFilter === "0") data = data.filter(d => d.activeSpCount === 0);
      else if (spFilter === "1") data = data.filter(d => d.activeSpCount === 1);
      else if (spFilter === "2") data = data.filter(d => d.activeSpCount === 2);
      else if (spFilter === "3") data = data.filter(d => d.activeSpCount >= 3);
    }
    if (roleFilter) {
      data = data.filter(d => d.employeeRole === roleFilter);
    }

    if (sort === "name-asc") data.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name-desc") data.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "sp-desc") data.sort((a, b) => b.activeSpCount - a.activeSpCount);

    return data;
  }, [initialData, search, shiftFilter, spFilter, sort, roleFilter]);

  function SpIcon({ level }: { level: number }) {
    if (level === 0) return <span className="text-muted-foreground">-</span>;
    const color = level === 1 ? "text-status-alpha" : level === 2 ? "text-status-break" : "text-status-sakit";
    return (
      <svg className={`size-4 ${color}`} viewBox="0 0 24 24" fill="currentColor">
        <rect width="20" height="20" x="2" y="2" rx="4" />
      </svg>
    );
  }

  function getTierColor(tier: string) {
    if (tier === "owner") return "text-status-alpha";
    if (tier === "admin") return "text-status-break";
    return "text-status-cuti";
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Topbar Filter */}
      <div className="tracker-glass-panel flex flex-col gap-0 rounded-xl border py-0">
        <div className="flex flex-col gap-2 p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            <div className="relative">
              <label className="sr-only">Search</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base h-9 bg-background/55 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Search worker name..."
              />
            </div>

            <div className="relative">
              <label className="sr-only">Shift</label>
              <select
                value={shiftFilter}
                onChange={e => setShiftFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Shifts</option>
                {workerShifts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            </div>

            <div className="relative">
              <label className="sr-only">SP Status</label>
              <select
                value={spFilter}
                onChange={e => setSpFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All SP Status</option>
                <option value="0">No SP</option>
                <option value="1">SP 1</option>
                <option value="2">SP 2</option>
                <option value="3">SP 3</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            </div>

            <div className="relative">
              <label className="sr-only">Sort</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="name-asc">Name &rarr; A-Z</option>
                <option value="name-desc">Name &rarr; Z-A</option>
                <option value="sp-desc">SP Status &rarr; High to Low</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            </div>

            <Button
              variant="outline"
              className="h-9 px-2.5 w-full sm:w-auto border-border bg-background hover:bg-muted"
              onClick={() => {
                setSearch("");
                setShiftFilter("");
                setSpFilter("");
                setRoleFilter("");
                setSort("name-asc");
              }}
            >
              <XIcon className="size-4 mr-1.5" /> Clear
            </Button>

            <Button
              className="h-9 px-2.5 w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlusIcon className="size-4 mr-1.5" /> Add Worker
            </Button>
          </div>

          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8 mt-1">
            <button
              onClick={() => setRoleFilter("")}
              className={`inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${roleFilter === "" ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20" : "border-border/75 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <span className="truncate">All</span>
            </button>
            {workerRoles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${roleFilter === role ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20" : "border-border/75 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                title={role}
              >
                <span className="truncate">{role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tracker-glass-panel overflow-hidden rounded-xl border bg-card/75">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">SP Status</th>
                <th className="px-4 py-3 text-center">Edit</th>
                <th className="px-4 py-3 text-center">Manage SP</th>
                {currentTier === "owner" && <th className="px-4 py-3 text-center">Pecat</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredData.map(row => (
                <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.isDeleted ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`block truncate text-[0.65rem] font-semibold uppercase tracking-widest ${getTierColor(row.tier)}`}>
                      {row.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.employeeRole || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.shift || "-"}</td>
                  <td className="px-4 py-3"><SpIcon level={row.activeSpCount} /></td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditRow(row)}>
                      <PenIcon className="size-4" />
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="icon-sm" onClick={() => setManageSpRow(row)}>
                      <TriangleAlertIcon className="size-4 text-status-sakit" />
                    </Button>
                  </td>
                  {currentTier === "owner" && (
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeactivateRow(row)}>
                        <UserXIcon className="size-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No workers found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
