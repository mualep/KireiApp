import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { TrackerCard } from "@/components/admin/tracker/tracker-card";
import { TrackerFilterForm } from "@/components/admin/tracker/tracker-filter-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  getTrackerStatusTabs,
  hasTrackerFilters,
  parseTrackerFilters,
  type TrackerSearchParams,
} from "@/lib/tracker/helpers";

export const metadata: Metadata = {
  title: "Tracker | Kireiku",
  description: "Read-only worker tracker overview.",
};

type AdminTrackerPageProps = {
  searchParams: Promise<TrackerSearchParams>;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

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
  const statusTabs = getTrackerStatusTabs(data.cards);
  const scopeLabel =
    staff.profile.tier === "member" ? "Self-only" : "All visible workers";
  const showActionPreview = staff.profile.tier !== "member";
  const emptyTitle = hasFilters
    ? "No workers match these filters."
    : staff.profile.tier === "member"
      ? "No tracker card is available for this account."
      : "No tracker cards are available yet.";

  return (
    <div className="flex flex-col gap-2.5">
      <section className="tracker-glass-panel flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-heading text-lg font-black">
            Tracker
          </h1>
          <Badge
            variant="outline"
            className="h-5 border-border bg-background/40 px-2 text-[0.65rem] text-muted-foreground"
          >
            {scopeLabel}
          </Badge>
        </div>
        <Badge
          variant="outline"
          className="h-5 border-border bg-background/30 px-2 text-[0.65rem] text-muted-foreground"
        >
          Read-only
        </Badge>
      </section>

      {data.issues.length > 0 ? <TrackerIssuePanel issues={data.issues} /> : null}

      <div className="sticky top-24 z-20">
        <TrackerFilterForm
          filters={filters}
          hasFilters={hasFilters}
          readableCount={numberFormatter.format(data.cards.length)}
          roleTabs={roleTabs}
          statusTabs={statusTabs}
          visibleCount={numberFormatter.format(cards.length)}
        />
      </div>

      {cards.length > 0 ? (
        <section
          aria-label="Worker tracker cards"
          className="tracker-card-grid gap-3"
        >
          {cards.map((card) => (
            <TrackerCard
              key={card.userId}
              card={card}
              showActionPreview={showActionPreview}
              updatedAtText={formatDate(card.statusUpdatedAt)}
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

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}
