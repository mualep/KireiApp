"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  filters: TrackerFilters;
  readableCount: string;
  roleTabs: TrackerRoleTab[];
  visibleCount: string;
};

export function TrackerFilterForm({
  filters,
  readableCount,
  roleTabs,
  visibleCount,
}: TrackerFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [shiftDraft, setShiftDraft] = useState(filters.shift ?? "");
  const [statusDraft, setStatusDraft] = useState(filters.status ?? "");
  const [sortDraft, setSortDraft] = useState<TrackerSortOption>(filters.sort);

  useEffect(() => {
    if (normalizeQuery(queryDraft) === filters.q) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(
        getTrackerHref({
          filters: {
            q: queryDraft,
            role: filters.role,
            shift: normalizeShift(shiftDraft),
            sort: sortDraft,
            status: normalizeStatus(statusDraft),
          },
          pathname,
        }),
        { scroll: false },
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    filters.q,
    filters.role,
    pathname,
    queryDraft,
    router,
    shiftDraft,
    sortDraft,
    statusDraft,
  ]);

  function getFilterHref({
    role = filters.role,
  }: {
    role?: TrackerFilters["role"];
  }) {
    return getTrackerHref({
      filters: {
        q: queryDraft,
        role,
        shift: normalizeShift(shiftDraft),
        sort: sortDraft,
        status: normalizeStatus(statusDraft),
      },
      pathname,
    });
  }

  function handleShiftChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const shift = event.currentTarget.value;

    setShiftDraft(shift);
    router.replace(
      getTrackerHref({
        filters: {
          q: queryDraft,
          role: filters.role,
          shift: normalizeShift(shift),
          sort: sortDraft,
          status: normalizeStatus(statusDraft),
        },
        pathname,
      }),
      { scroll: false },
    );
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const status = event.currentTarget.value;

    setStatusDraft(status);
    router.replace(
      getTrackerHref({
        filters: {
          q: queryDraft,
          role: filters.role,
          shift: normalizeShift(shiftDraft),
          sort: sortDraft,
          status: normalizeStatus(status),
        },
        pathname,
      }),
      { scroll: false },
    );
  }

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const sort = event.currentTarget.value as TrackerSortOption;

    setSortDraft(sort);
    router.replace(
      getTrackerHref({
        filters: {
          q: queryDraft,
          role: filters.role,
          shift: normalizeShift(shiftDraft),
          sort,
          status: normalizeStatus(statusDraft),
        },
        pathname,
      }),
      { scroll: false },
    );
  }

  return (
    <Card
      size="sm"
      className="tracker-glass-panel gap-0 rounded-xl border py-0"
    >
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            {/* Search */}
            <div role="group">
              <label htmlFor="tracker-search" className="sr-only">
                Search
              </label>
              <input
                id="tracker-search"
                name="q"
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.currentTarget.value)}
                placeholder="Search worker name…"
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
                value={shiftDraft}
                onChange={handleShiftChange}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Shifts</option>
                {workerShifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift === "flexible" ? "Flexible" : shift}
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
                value={statusDraft}
                onChange={handleStatusChange}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Statuses</option>
                {workerDisplayStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
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
                value={sortDraft}
                onChange={handleSortChange}
                className="w-full appearance-none rounded-lg border border-input px-2.5 py-1 pr-8 text-sm h-9 bg-background/55 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="name-asc">Name &#x2192; A-Z</option>
                <option value="name-desc">Name &#x2192; Z-A</option>
                <option value="status-urgent">Status &#x2192; Urgent</option>
                <option value="status-not-urgent">
                  Status &#x2192; Tidak Urgent
                </option>
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
                aria-hidden="true"
              />
            </div>

            {/* Clear */}
            <Button
              asChild
              variant="outline"
              className="h-9 w-full sm:w-auto px-2.5 gap-1.5 border-border bg-background hover:bg-muted hover:text-foreground"
            >
              <Link href={pathname}>
                <XIcon className="size-4" aria-hidden="true" />
                Clear
              </Link>
            </Button>

            {/* Counter */}
            <div className="flex h-9 items-center justify-end gap-2 rounded-lg border border-border/75 bg-background/35 px-3 text-xs text-muted-foreground">
              <ArrowDownAZIcon aria-hidden="true" />
              <span className="font-mono tabular-nums" translate="no">
                {visibleCount}/{readableCount}
              </span>
              <span className="hidden sm:inline">workers</span>
            </div>
          </div>
        </div>

        <nav aria-label="Tracker role groups" className="w-full">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
            {roleTabs.map((tab) => {
              const isActive = filters.role === tab.value;

              return (
                <Link
                  key={tab.label}
                  href={getFilterHref({ role: tab.value })}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${tab.label}: ${tab.count} workers`}
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

function getTrackerHref({
  filters,
  pathname,
}: {
  filters: TrackerFilters;
  pathname: string;
}) {
  const params = new URLSearchParams();
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

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.sort !== "name-asc") {
    params.set("sort", filters.sort);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeShift(value: string): TrackerFilters["shift"] {
  return value === "" ? null : (value as TrackerFilters["shift"]);
}

function normalizeStatus(value: string): TrackerFilters["status"] {
  return value === "" ? null : (value as TrackerFilters["status"]);
}
