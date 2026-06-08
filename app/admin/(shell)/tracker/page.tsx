import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { TrackerCard } from "@/components/admin/tracker/tracker-card";
import { TrackerFilterForm } from "@/components/admin/tracker/tracker-filter-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getTrackerData } from "@/lib/tracker/data";
import {
  filterAndSortTrackerCards,
  getTrackerRoleTabs,
  hasTrackerFilters,
  parseTrackerFilters,
  type TrackerSearchParams,
} from "@/lib/tracker/helpers";
import { canStaffTierPerformTrackerAction } from "@/lib/workers/tracker-actions";

export const metadata: Metadata = {
  title: "Tracker | KireiApp",
  description: "Read-only worker tracker overview.",
};

type AdminTrackerPageProps = {
  searchParams: Promise<TrackerSearchParams>;
};


const numberFormatter = new Intl.NumberFormat("id-ID");

export default async function AdminTrackerPage({
  searchParams,
}: AdminTrackerPageProps) {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  const filters = parseTrackerFilters(await searchParams);
  const hasFilters = hasTrackerFilters(filters);
  const data = await getTrackerData(staff);
  const cards = filterAndSortTrackerCards(data.cards, filters);
  const roleTabs = getTrackerRoleTabs(data.cards);
  const canApplyTrackerActions = canStaffTierPerformTrackerAction(staff.profile.tier);
  const emptyTitle = hasFilters
    ? "No workers match these filters."
    : staff.profile.tier === "member"
      ? "No tracker card is available for this account."
      : "No tracker cards are available yet.";

  return (
    <div className="flex flex-col gap-6">
      {data.issues.length > 0 ? <TrackerIssuePanel issues={data.issues} /> : null}

      <TrackerFilterForm
        key={`${filters.q}:${filters.role ?? ""}:${filters.shift ?? ""}:${filters.status ?? ""}`}
        filters={filters}
        readableCount={numberFormatter.format(data.cards.length)}
        roleTabs={roleTabs}
        visibleCount={numberFormatter.format(cards.length)}
      />

      {cards.length > 0 ? (
        <section
          aria-label="Worker tracker cards"
          className="tracker-card-grid gap-3"
        >
          {cards.map((card) => (
          <TrackerCard
              key={card.userId}
              card={card}
              canApplyTrackerActions={canApplyTrackerActions}
            />
          ))}
        </section>
      ) : (
        <TrackerEmptyState hasFilters={hasFilters} title={emptyTitle} />
      )}
    </div>
  );
}

function TrackerIssuePanel({
  issues,
}: {
  issues: Array<{ message: string }>;
}) {
  return (
    <Alert>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Tracker Loaded With Notes</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {issues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function TrackerEmptyState({
  hasFilters,
  title,
}: {
  hasFilters: boolean;
  title: string;
}) {
  return (
    <Card className="tracker-glass-panel rounded-2xl border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {hasFilters
            ? "Clear filters to return to the full readable tracker view."
            : "The read-only tracker will show cards as soon as visible worker profiles and status rows are available."}
        </CardDescription>
      </CardHeader>
      {hasFilters ? (
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin/tracker">Clear Filters</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
