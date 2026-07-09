"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  RecordsFilters,
  RecordsRoleTab,
  RecordsSortOption,
} from "@/lib/records/filters";
import type { RecordsMonthRange } from "@/lib/records/helpers";
import type { WorkerShift } from "@/lib/workers";
import { ResetRecordsDialog } from "./reset-records-dialog";

type RecordsToolbarProps = {
  filters: RecordsFilters;
  month: RecordsMonthRange;
  readableCount: string;
  roleTabs: RecordsRoleTab[];
  scopeLabel: string | null;
  visibleCount: string;
  isOwner?: boolean;
};

export function RecordsToolbar({
  filters,
  month,
  readableCount,
  roleTabs,
  scopeLabel,
  visibleCount,
  isOwner,
}: RecordsToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [shiftDraft, setShiftDraft] = useState<WorkerShift | "">(filters.shift ?? "");
  const [sortDraft, setSortDraft] = useState<RecordsSortOption>(filters.sort);
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    if (normalizeQuery(queryDraft) === filters.q) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(
        getMonthHref({
          filters: { q: queryDraft, role: filters.role, shift: shiftDraft || null, sort: sortDraft },
          monthParam: month.monthParam,
          pathname,
        }),
        { scroll: false },
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    filters.q,
    filters.role,
    month.monthParam,
    pathname,
    queryDraft,
    router,
    shiftDraft,
    sortDraft,
  ]);

  const previousMonthHref = getMonthHref({
    filters,
    monthParam: month.previousMonthParam,
    pathname,
  });
  const nextMonthHref = getMonthHref({
    filters,
    monthParam: month.nextMonthParam,
    pathname,
  });
  const clearFiltersHref = getMonthHref({
    filters: { q: "", role: null, shift: null, sort: "name-asc" },
    monthParam: month.monthParam,
    pathname,
  });

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const sort = event.currentTarget.value as RecordsSortOption;

    setSortDraft(sort);
    router.replace(
      getMonthHref({
        filters: { q: queryDraft, role: filters.role, shift: shiftDraft || null, sort },
        monthParam: month.monthParam,
        pathname,
      }),
      { scroll: false },
    );
  }

  function handleShiftChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const shift = (event.currentTarget.value || null) as WorkerShift | null;

    setShiftDraft(shift ?? "");
    router.replace(
      getMonthHref({
        filters: { q: queryDraft, role: filters.role, shift, sort: sortDraft },
        monthParam: month.monthParam,
        pathname,
      }),
      { scroll: false },
    );
  }

  return (
    <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="records-toolbar-row flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-2 md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,auto)_minmax(8rem,auto)_auto]">
            {/* Search */}
            <div role="group">
              <label htmlFor="records-search" className="sr-only">
                Search
              </label>
              <input
                id="records-search"
                name="q"
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.currentTarget.value)}
                placeholder="Cari nama pekerja..."
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base h-9 bg-background/55 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            {/* Sort */}
            <div role="group" className="relative">
              <label htmlFor="records-sort" className="sr-only">
                Sort
              </label>
              <select
                id="records-sort"
                aria-label="Sort order"
                value={sortDraft}
                onChange={handleSortChange}
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
              <label htmlFor="records-shift" className="sr-only">
                Shift
              </label>
              <select
                id="records-shift"
                aria-label="Shift Filter"
                value={shiftDraft}
                onChange={handleShiftChange}
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
                asChild
                variant="outline"
                className="h-9 w-full sm:w-auto px-2.5 gap-1.5 border-border bg-background hover:bg-muted hover:text-foreground"
              >
                <Link href={clearFiltersHref}>
                  <XIcon className="size-4" aria-hidden="true" />
                  Bersihkan Filter
                </Link>
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
            {isOwner ? (
              <Button
                variant="destructive"
                className="h-9 px-3 gap-1.5 font-semibold text-xs border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                onClick={() => setIsResetOpen(true)}
              >
                Reset Records
              </Button>
            ) : null}
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
              <span className="hidden sm:inline">records</span>
            </div>
          </div>
        </div>

        {isOwner ? (
          <ResetRecordsDialog
            isOpen={isResetOpen}
            onOpenChange={setIsResetOpen}
            monthParam={month.monthParam}
            monthLabel={month.monthLabel}
          />
        ) : null}

        <nav aria-label="Records role groups" className="records-toolbar-tabs w-full">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
            {roleTabs.map((tab) => {
              const isActive = filters.role === tab.value;
              const href = getMonthHref({
                filters: {
                  q: queryDraft,
                  role: tab.value,
                  shift: shiftDraft || null,
                  sort: sortDraft,
                },
                monthParam: month.monthParam,
                pathname,
              });

              return (
                <Link
                  key={tab.label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${tab.label}: ${tab.count} records`}
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
                </Link>
              );
            })}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}

function getMonthHref({
  filters,
  monthParam,
  pathname,
}: {
  filters: RecordsFilters;
  monthParam: string;
  pathname: string;
}) {
  const params = new URLSearchParams();
  params.set("month", monthParam);

  const q = normalizeQuery(filters.q);
  if (q) {
    params.set("q", q);
  }

  if (filters.role) {
    params.set("role", filters.role);
  }

  if (filters.shift) {
    params.set("shift", filters.shift);
  }

  if (filters.sort !== "name-asc") {
    params.set("sort", filters.sort);
  }

  return `${pathname}?${params.toString()}`;
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
