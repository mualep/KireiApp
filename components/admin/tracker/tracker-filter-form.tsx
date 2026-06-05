"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownAZIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TrackerFilters, TrackerRoleTab } from "@/lib/tracker/helpers";
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const key of ["q", "role", "shift", "status"] as const) {
      const value = formData.get(key);

      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function getFilterHref({
    role = filters.role,
  }: {
    role?: TrackerFilters["role"];
  }) {
    const params = new URLSearchParams();

    if (filters.q) {
      params.set("q", filters.q);
    }

    if (role) {
      params.set("role", role);
    }

    if (filters.shift) {
      params.set("shift", filters.shift);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <Card size="sm" className="tracker-glass-panel gap-0 rounded-xl border py-0">
      <CardContent className="flex flex-col gap-2 p-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="hidden" name="role" value={filters.role ?? ""} />
          <FieldGroup className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(13rem,1.3fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_minmax(9rem,0.62fr)_auto_auto]">
            <Field>
              <FieldLabel htmlFor="tracker-search" className="sr-only">
                Search
              </FieldLabel>
              <Input
                id="tracker-search"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Search worker name…"
                autoComplete="off"
                className="h-9 bg-background/55"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tracker-shift" className="sr-only">
                Shift
              </FieldLabel>
              <Select
                id="tracker-shift"
                name="shift"
                defaultValue={filters.shift ?? ""}
                className="h-9 bg-background/55"
              >
                <option value="">All Shifts</option>
                {workerShifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift === "flexible" ? "Flexible" : shift}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="tracker-status" className="sr-only">
                Status
              </FieldLabel>
              <Select
                id="tracker-status"
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-9 bg-background/55"
              >
                <option value="">All Statuses</option>
                {workerDisplayStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>

            <Field data-disabled>
              <FieldLabel htmlFor="tracker-sort" className="sr-only">
                Sort
              </FieldLabel>
              <Select
                id="tracker-sort"
                aria-label="Sort order"
                defaultValue="critical-name"
                disabled
                className="h-9 bg-background/55"
              >
                <option value="critical-name">Critical → A-Z</option>
              </Select>
            </Field>

            <div className="flex items-center gap-2">
              <Button type="submit" className="h-9 w-full sm:w-auto">
                <SearchIcon data-icon="inline-start" aria-hidden="true" />
                Apply
              </Button>
              <Button asChild variant="outline" className="h-9 w-full sm:w-auto">
                <Link href={pathname}>
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                  Clear
                </Link>
              </Button>
            </div>

            <div className="flex h-9 items-center justify-end gap-2 rounded-lg border border-border/75 bg-background/35 px-3 text-xs text-muted-foreground">
              <ArrowDownAZIcon aria-hidden="true" />
              <span className="font-mono tabular-nums" translate="no">
                {visibleCount}/{readableCount}
              </span>
              <span className="hidden sm:inline">workers</span>
            </div>
          </FieldGroup>
        </form>

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
