import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AbsensiMonthRange } from "@/lib/absensi/helpers";
import type { AbsensiFilters, AbsensiRoleTab } from "@/lib/absensi/filters";

type AbsensiToolbarProps = {
  filters: AbsensiFilters;
  modeLabel: string;
  month: AbsensiMonthRange;
  readableCount: string;
  roleTabs: AbsensiRoleTab[];
  scopeLabel: string;
  visibleCount: string;
};

export function AbsensiToolbar({
  filters,
  modeLabel,
  month,
  readableCount,
  roleTabs,
  scopeLabel,
  visibleCount,
}: AbsensiToolbarProps) {
  const previousMonthHref = getMonthHref({
    filters,
    monthParam: month.previousMonthParam,
  });
  const nextMonthHref = getMonthHref({
    filters,
    monthParam: month.nextMonthParam,
  });
  const clearFiltersHref = getMonthHref({
    filters: { q: "", role: null },
    monthParam: month.monthParam,
  });

  return (
    <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Selected Month
              </p>
              <p className="truncate text-sm font-black" translate="no">
                {month.monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-6 border-border bg-background/40 px-2 text-[0.65rem] text-muted-foreground"
            >
              {scopeLabel}
            </Badge>
            <Badge
              variant="outline"
              className="h-6 border-border bg-background/30 px-2 text-[0.65rem] text-muted-foreground"
            >
              {modeLabel}
            </Badge>
            <Button asChild variant="outline" size="icon-sm">
              <Link href={previousMonthHref} aria-label="Previous Month">
                <ChevronLeftIcon aria-hidden="true" />
              </Link>
            </Button>
            <Badge
              variant="outline"
              className="h-7 min-w-28 border-border bg-background/35 px-2 font-mono text-[0.7rem] text-foreground"
              translate="no"
            >
              {month.monthParam}
            </Badge>
            <Button asChild variant="outline" size="icon-sm">
              <Link href={nextMonthHref} aria-label="Next Month">
                <ChevronRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <form action="/admin/absensi" className="flex flex-col gap-2">
          <input type="hidden" name="month" value={month.monthParam} />
          <input type="hidden" name="role" value={filters.role ?? ""} />
          <FieldGroup className="grid gap-2 md:grid-cols-[minmax(13rem,1fr)_auto_auto]">
            <Field>
              <FieldLabel htmlFor="absensi-search" className="sr-only">
                Search
              </FieldLabel>
              <Input
                id="absensi-search"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Search worker name…"
                autoComplete="off"
                className="h-9 bg-background/55"
              />
            </Field>

            <div className="flex items-center gap-2">
              <Button type="submit" className="h-9 w-full sm:w-auto">
                <SearchIcon data-icon="inline-start" aria-hidden="true" />
                Apply
              </Button>
              <Button asChild variant="outline" className="h-9 w-full sm:w-auto">
                <Link href={clearFiltersHref}>
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                  Clear Filters
                </Link>
              </Button>
            </div>

            <div className="flex h-9 items-center justify-end gap-2 rounded-lg border border-border/75 bg-background/35 px-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums" translate="no">
                {visibleCount}/{readableCount}
              </span>
              <span className="hidden sm:inline">workers</span>
            </div>
          </FieldGroup>
        </form>

        <nav aria-label="Absensi role groups" className="w-full">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-8">
            {roleTabs.map((tab) => {
              const isActive = filters.role === tab.value;
              const href = getMonthHref({
                filters: {
                  q: filters.q,
                  role: tab.value,
                },
                monthParam: month.monthParam,
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
}: {
  filters: AbsensiFilters;
  monthParam: string;
}) {
  const params = new URLSearchParams();
  params.set("month", monthParam);

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.role) {
    params.set("role", filters.role);
  }

  return `/admin/absensi?${params.toString()}`;
}
