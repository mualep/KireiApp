"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AbsensiMonthRange } from "@/lib/absensi/helpers";
import type {
  AbsensiFilters,
  AbsensiRoleTab,
  AbsensiSortOption,
} from "@/lib/absensi/filters";
import type { WorkerShift } from "@/lib/workers";

type AbsensiToolbarProps = {
  month: AbsensiMonthRange;
  onClearFilters: () => void;
  onQueryChange: (query: string) => void;
  onRoleChange: (role: AbsensiFilters["role"]) => void;
  onShiftChange: (shift: string) => void;
  onSortChange: (sort: AbsensiSortOption) => void;
  query: string;
  readableCount: string;
  role: AbsensiFilters["role"];
  roleTabs: AbsensiRoleTab[];
  scopeLabel: string | null;
  shift: string;
  sort: AbsensiSortOption;
  visibleCount: string;
};

export function AbsensiToolbar({
  month,
  onClearFilters,
  onQueryChange,
  onRoleChange,
  onShiftChange,
  onSortChange,
  query,
  readableCount,
  role,
  roleTabs,
  scopeLabel,
  shift,
  sort,
  visibleCount,
}: AbsensiToolbarProps) {
  const pathname = usePathname();

  const previousMonthHref = getMonthHref({ monthParam: month.previousMonthParam, pathname });
  const nextMonthHref = getMonthHref({ monthParam: month.nextMonthParam, pathname });

  return (
    <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="absensi-toolbar-row flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-2 md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,auto)_minmax(8rem,auto)_auto]">
            {/* Search */}
            <div role="group">
              <label htmlFor="absensi-search" className="sr-only">
                Search
              </label>
              <input
                id="absensi-search"
                name="q"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
                placeholder="Cari nama pekerja..."
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base h-9 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            {/* Sort */}
            <div role="group" className="relative">
              <label htmlFor="absensi-sort" className="sr-only">
                Sort
              </label>
              <select
                id="absensi-sort"
                aria-label="Sort order"
                value={sort}
                onChange={(e) => onSortChange(e.currentTarget.value as AbsensiSortOption)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="name-asc">Nama &#x2192; A-Z</option>
                <option value="name-desc">Nama &#x2192; Z-A</option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Shift */}
            <div role="group" className="relative">
              <label htmlFor="absensi-shift" className="sr-only">
                Shift
              </label>
              <select
                id="absensi-shift"
                aria-label="Shift Filter"
                value={shift}
                onChange={(e) => onShiftChange(e.currentTarget.value)}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua Shift</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
                <option value="C">Shift C</option>
                <option value="D">Shift D</option>
                <option value="E">Shift E</option>
                <option value="F">Shift F</option>
                <option value="1">Shift 1</option>
                <option value="2">Shift 2</option>
                <option value="3">Shift 3</option>
                <option value="flexible">Flexible</option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Clear */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClearFilters}
                className="h-9 w-full sm:w-auto px-2.5 gap-1.5 border-border bg-background hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" aria-hidden="true" />
                Bersihkan Filter
              </Button>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="icon-sm">
              <Link href={previousMonthHref} aria-label="Previous Month">
                <ChevronLeftIcon aria-hidden="true" />
              </Link>
            </Button>
            <Badge
              variant="outline"
              className="h-9 min-w-32 justify-center border-border bg-background/35 px-3 text-sm font-black text-foreground"
              translate="no"
            >
              {month.monthLabel}
            </Badge>
            <Button asChild variant="outline" size="icon-sm">
              <Link href={nextMonthHref} aria-label="Next Month">
                <ChevronRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            {scopeLabel ? (
              <Badge
                variant="outline"
                className="h-6 border-border bg-background/40 px-2 text-[0.65rem] text-muted-foreground"
              >
                {scopeLabel}
              </Badge>
            ) : null}
            <div className="flex h-9 items-center justify-end gap-2 rounded-lg border border-border/75 bg-background/35 px-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums" translate="no">
                {visibleCount}/{readableCount}
              </span>
              <span className="hidden sm:inline">pekerja</span>
            </div>
          </div>
        </div>

        <nav aria-label="Absensi role groups" className="absensi-toolbar-tabs w-full">
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

function getMonthHref({
  monthParam,
  pathname,
}: {
  monthParam: string;
  pathname: string;
}) {
  return `${pathname}?month=${monthParam}`;
}
