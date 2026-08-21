"use client";

import type React from "react";
import { ArrowDownAZIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  TrackerFilters,
  TrackerRoleTab,
  TrackerSortOption,
} from "@/lib/tracker/helpers";
import { workerDisplayStatuses, workerShifts } from "@/lib/workers";

type TrackerFilterFormProps = {
  onClearFilters: () => void;
  onQueryChange: (query: string) => void;
  onRoleChange: (role: TrackerFilters["role"]) => void;
  onShiftChange: (shift: string) => void;
  onSortChange: (sort: TrackerSortOption) => void;
  onStatusChange: (status: string) => void;
  query: string;
  readableCount: string;
  role: TrackerFilters["role"];
  roleTabs: TrackerRoleTab[];
  shift: string;
  sort: TrackerSortOption;
  status: string;
  visibleCount: string;
};

export function TrackerFilterForm({
  onClearFilters,
  onQueryChange,
  onRoleChange,
  onShiftChange,
  onSortChange,
  onStatusChange,
  query,
  readableCount,
  role,
  roleTabs,
  shift,
  sort,
  status,
  visibleCount,
}: TrackerFilterFormProps) {
  return (
    <Card
      size="sm"
      className="tracker-glass-panel gap-0 rounded-xl border py-0"
    >
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto]">
            {/* Search */}
            <div role="group">
              <label htmlFor="tracker-search" className="sr-only">
                Search
              </label>
              <input
                id="tracker-search"
                name="q"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
                placeholder="Cari nama pekerja..."
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base h-9 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            {/* Shift */}
            <div role="group" className="relative">
              <label htmlFor="tracker-shift" className="sr-only">
                Shift
              </label>
              <select
                id="tracker-shift"
                name="shift"
                value={shift}
                onChange={(e) => onShiftChange(e.currentTarget.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua Shift</option>
                {workerShifts.map((s) => (
                  <option key={s} value={s}>
                    {s === "flexible" ? "Flexible" : s}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Status */}
            <div role="group" className="relative">
              <label htmlFor="tracker-status" className="sr-only">
                Status
              </label>
              <select
                id="tracker-status"
                name="status"
                value={status}
                onChange={(e) => onStatusChange(e.currentTarget.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua Status</option>
                {workerDisplayStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Sort */}
            <div role="group" className="relative">
              <label htmlFor="tracker-sort" className="sr-only">
                Sort
              </label>
              <select
                id="tracker-sort"
                aria-label="Sort order"
                value={sort}
                onChange={(e) => onSortChange(e.currentTarget.value as TrackerSortOption)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="name-asc">Nama &#x2192; A-Z</option>
                <option value="name-desc">Nama &#x2192; Z-A</option>
                <option value="status-urgent">Status &#x2192; Darurat</option>
                <option value="status-not-urgent">
                  Status &#x2192; Tidak Darurat
                </option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Clear */}
            <Button
              type="button"
              variant="outline"
              onClick={onClearFilters}
              className="h-9 w-full sm:w-auto px-2.5 gap-1.5 border-border bg-background hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
              Bersihkan
            </Button>
          </div>
        </div>

        <nav aria-label="Tracker role groups" className="w-full">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
            {roleTabs.map((tab) => {
              const isActive = role === tab.value;

              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => onRoleChange(tab.value)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${tab.label}: ${tab.count} pekerja`}
                  title={tab.label}
                  className={cn(
                    "inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20"
                      : "border-border/75 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden truncate sm:inline lg:hidden">
                    {tab.shortLabel}
                  </span>
                  <span className="hidden truncate lg:inline">{tab.label}</span>
                  <span className="rounded-full border border-current/20 bg-background/45 px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}
