"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AbsensiMonthRange } from "@/lib/absensi/helpers";
import type {
  AbsensiFilters,
  AbsensiRoleTab,
  AbsensiSortOption,
} from "@/lib/absensi/filters";

type AbsensiToolbarProps = {
  filters: AbsensiFilters;
  month: AbsensiMonthRange;
  readableCount: string;
  roleTabs: AbsensiRoleTab[];
  scopeLabel: string | null;
  visibleCount: string;
};

export function AbsensiToolbar({
  filters,
  month,
  readableCount,
  roleTabs,
  scopeLabel,
  visibleCount,
}: AbsensiToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [sortDraft, setSortDraft] = useState<AbsensiSortOption>(filters.sort);

  useEffect(() => {
    if (normalizeQuery(queryDraft) === filters.q) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(
        getMonthHref({
          filters: { q: queryDraft, role: filters.role, sort: sortDraft },
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
    filters: { q: "", role: null, sort: "name-asc" },
    monthParam: month.monthParam,
    pathname,
  });

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const sort = event.currentTarget.value as AbsensiSortOption;

    setSortDraft(sort);
    router.replace(
      getMonthHref({
        filters: { q: queryDraft, role: filters.role, sort },
        monthParam: month.monthParam,
        pathname,
      }),
      { scroll: false },
    );
  }

  return (
    <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="absensi-toolbar-row flex flex-col gap-2 lg:flex-row lg:items-center">
          <FieldGroup className="absensi-toolbar-controls grid flex-1 gap-2 md:grid-cols-[minmax(13rem,1fr)_minmax(9rem,auto)_auto]">
            <Field>
              <FieldLabel htmlFor="absensi-search" className="sr-only">
                Search
              </FieldLabel>
              <Input
                id="absensi-search"
                name="q"
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.currentTarget.value)}
                placeholder="Search worker name…"
                autoComplete="off"
                className="h-9 bg-background/55"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="absensi-sort" className="sr-only">
                Sort
              </FieldLabel>
              <Select
                id="absensi-sort"
                aria-label="Sort order"
                value={sortDraft}
                onChange={handleSortChange}
                className="h-9 bg-background/55"
              >
                <option value="name-asc">Name &#x2192; A-Z</option>
                <option value="name-desc">Name &#x2192; Z-A</option>
              </Select>
            </Field>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="h-9 w-full sm:w-auto">
                <Link href={clearFiltersHref}>
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                  Clear Filters
                </Link>
              </Button>
            </div>
          </FieldGroup>

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
              <span className="hidden sm:inline">workers</span>
            </div>
          </div>
        </div>

        <nav aria-label="Absensi role groups" className="absensi-toolbar-tabs w-full">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
            {roleTabs.map((tab) => {
              const isActive = filters.role === tab.value;
              const href = getMonthHref({
                filters: {
                  q: queryDraft,
                  role: tab.value,
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

function getMonthHref({
  filters,
  monthParam,
  pathname,
}: {
  filters: AbsensiFilters;
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

  if (filters.sort !== "name-asc") {
    params.set("sort", filters.sort);
  }

  return `${pathname}?${params.toString()}`;
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
