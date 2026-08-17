"use client";

import { useMemo, useState } from "react";

import { TrackerCard } from "@/components/admin/tracker/tracker-card";
import { TrackerFilterForm } from "@/components/admin/tracker/tracker-filter-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  TrackerFilters,
  TrackerRoleTab,
  TrackerSortOption,
} from "@/lib/tracker/helpers";
import { filterAndSortTrackerCards } from "@/lib/tracker/helpers";
import type { TrackerCardDTO } from "@/lib/workers";

type TrackerClientShellProps = {
  canApplyTrackerActions: boolean;
  initialCards: TrackerCardDTO[];
  roleTabs: TrackerRoleTab[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function TrackerClientShell({
  canApplyTrackerActions,
  initialCards,
  roleTabs,
}: TrackerClientShellProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<TrackerFilters["role"]>(null);
  const [shift, setShift] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] = useState<TrackerSortOption>("name-asc");

  const localFilters: TrackerFilters = useMemo(
    () => ({
      q: query,
      role,
      shift: shift === "" ? null : (shift as TrackerFilters["shift"]),
      sort,
      status: status === "" ? null : (status as TrackerFilters["status"]),
    }),
    [query, role, shift, sort, status],
  );

  const filteredCards = useMemo(
    () => filterAndSortTrackerCards(initialCards, localFilters),
    [initialCards, localFilters],
  );

  const hasActiveFilters = Boolean(
    query.trim() || role !== null || shift !== "" || status !== "" || sort !== "name-asc",
  );

  function handleClearFilters() {
    setQuery("");
    setRole(null);
    setShift("");
    setStatus("");
    setSort("name-asc");
  }

  return (
    <div className="flex flex-col gap-4">
      <TrackerFilterForm
        query={query}
        role={role}
        shift={shift}
        status={status}
        sort={sort}
        onQueryChange={setQuery}
        onRoleChange={setRole}
        onShiftChange={setShift}
        onStatusChange={setStatus}
        onSortChange={setSort}
        onClearFilters={handleClearFilters}
        readableCount={numberFormatter.format(initialCards.length)}
        visibleCount={numberFormatter.format(filteredCards.length)}
        roleTabs={roleTabs}
      />

      {filteredCards.length > 0 ? (
        <section
          aria-label="Worker tracker cards"
          className="tracker-card-grid gap-3"
        >
          {filteredCards.map((card) => (
            <TrackerCard
              key={`${card.userId}:${card.version}`}
              card={card}
              canApplyTrackerActions={canApplyTrackerActions}
            />
          ))}
        </section>
      ) : (
        <TrackerEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      )}
    </div>
  );
}

function TrackerEmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Card className="tracker-glass-panel rounded-2xl border">
      <CardHeader>
        <CardTitle>
          {hasFilters
            ? "No workers match these filters."
            : "No tracker cards are available yet."}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? "Clear filters to return to the full readable tracker view."
            : "The read-only tracker will show cards as soon as visible worker profiles and status rows are available."}
        </CardDescription>
      </CardHeader>
      {hasFilters ? (
        <CardContent>
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
