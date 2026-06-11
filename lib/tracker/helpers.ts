import type { StaffTier } from "@/lib/auth/tiers";
import {
  isWorkerDisplayStatus,
  isWorkerRole,
  isWorkerShift,
  type TrackerCardDTO,
  type WorkerDisplayStatus,
  type WorkerRole,
  type WorkerShift,
} from "@/lib/workers";

export type TrackerSortOption = "name-asc" | "name-desc" | "status-urgent" | "status-not-urgent";

const trackerSortOptions = new Set<TrackerSortOption>([
  "name-asc",
  "name-desc",
  "status-urgent",
  "status-not-urgent",
]);

function isTrackerSortOption(value: string): value is TrackerSortOption {
  return trackerSortOptions.has(value as TrackerSortOption);
}

export type TrackerFilters = {
  q: string;
  role: WorkerRole | null;
  shift: WorkerShift | null;
  sort: TrackerSortOption;
  status: WorkerDisplayStatus | null;
};

export type TrackerScope = {
  tier: StaffTier;
  userId: string;
};

export type TrackerSearchParams = Record<string, string | string[] | undefined>;

export type TrackerRoleTab = {
  count: number;
  label: string;
  shortLabel: string;
  value: WorkerRole | null;
};

export type TrackerStatusTab = {
  count: number;
  label: WorkerDisplayStatus;
  value: WorkerDisplayStatus;
};

const criticalStatusOrder: WorkerDisplayStatus[] = [
  "ALPHA",
  "LATE",
  "BREAK",
  "ON",
  "PENDING",
  "LEMBUR",
  "SAKIT",
  "CUTI",
  "OFF",
];

const criticalStatusRanks = new Map(
  criticalStatusOrder.map((status, index) => [status, index]),
);

const trackerRoleTabDefinitions = [
  { label: "Professional Player", shortLabel: "PP", value: "Professional Player" },
  { label: "Expert Player", shortLabel: "EP", value: "Expert Player" },
  { label: "Customer Service", shortLabel: "CS", value: "Customer Service" },
  { label: "Explorer", shortLabel: "EX", value: "Explorer" },
  { label: "Security", shortLabel: "SC", value: "Security" },
  { label: "Cleaning Service", shortLabel: "CL", value: "Cleaning Service" },
  { label: "Internship", shortLabel: "IN", value: "Internship" },
] satisfies Array<{ label: string; shortLabel: string; value: WorkerRole }>;

const trackerStatusTabOrder = [
  "OFF",
  "ON",
  "BREAK",
  "CUTI",
  "SAKIT",
  "PENDING",
  "LEMBUR",
  "LATE",
  "ALPHA",
] satisfies WorkerDisplayStatus[];

export function parseTrackerFilters(searchParams: TrackerSearchParams): TrackerFilters {
  const q = normalizeQueryParam(searchParams.q);
  const role = normalizeSingleParam(searchParams.role);
  const shift = normalizeSingleParam(searchParams.shift);
  const sort = normalizeSingleParam(searchParams.sort);
  const status = normalizeSingleParam(searchParams.status);

  // Backward compat: old URLs with ?sort=critical-name gracefully upgrade to status-urgent
  const resolvedSort = sort === "critical-name" ? "status-urgent" : sort;

  return {
    q: q.slice(0, 80),
    role: isWorkerRole(role) ? role : null,
    shift: isWorkerShift(shift) ? shift : null,
    sort: isTrackerSortOption(resolvedSort) ? resolvedSort : "name-asc",
    status: isWorkerDisplayStatus(status) ? status : null,
  };
}

export function hasTrackerFilters(filters: TrackerFilters): boolean {
  return Boolean(filters.q || filters.role || filters.shift || filters.status || filters.sort !== "name-asc");
}

export function scopeTrackerCards(
  cards: TrackerCardDTO[],
  scope: TrackerScope,
): TrackerCardDTO[] {
  if (scope.tier !== "member") {
    return cards;
  }

  return cards.filter((card) => card.userId === scope.userId);
}

export function filterTrackerCards(
  cards: TrackerCardDTO[],
  filters: TrackerFilters,
): TrackerCardDTO[] {
  const normalizedSearch = filters.q.toLocaleLowerCase("id-ID");

  return cards.filter((card) => {
    if (filters.role && card.employeeRole !== filters.role) {
      return false;
    }

    if (filters.shift && card.shift !== filters.shift) {
      return false;
    }

    if (filters.status && card.displayStatus !== filters.status) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      card.name.toLocaleLowerCase("id-ID").includes(normalizedSearch) ||
      card.gid.toLocaleLowerCase("id-ID").includes(normalizedSearch)
    );
  });
}

const notUrgentStatusOrder: WorkerDisplayStatus[] = [...criticalStatusOrder].reverse();
const notUrgentStatusRanks = new Map(
  notUrgentStatusOrder.map((status, index) => [status, index]),
);

export function sortTrackerCards(cards: TrackerCardDTO[]): TrackerCardDTO[] {
  return [...cards].sort((left, right) => {
    const statusDelta =
      getCriticalStatusRank(left.displayStatus) -
      getCriticalStatusRank(right.displayStatus);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.name.localeCompare(right.name, "id-ID", {
      sensitivity: "base",
    });
  });
}

export function sortTrackerCardsByName(cards: TrackerCardDTO[]): TrackerCardDTO[] {
  return [...cards].sort((left, right) =>
    left.name.localeCompare(right.name, "id-ID", { sensitivity: "base" }),
  );
}

export function sortTrackerCardsByNameDesc(cards: TrackerCardDTO[]): TrackerCardDTO[] {
  return [...cards].sort((left, right) =>
    right.name.localeCompare(left.name, "id-ID", { sensitivity: "base" }),
  );
}

export function sortTrackerCardsByNotUrgent(cards: TrackerCardDTO[]): TrackerCardDTO[] {
  return [...cards].sort((left, right) => {
    const statusDelta =
      (notUrgentStatusRanks.get(left.displayStatus) ?? notUrgentStatusOrder.length) -
      (notUrgentStatusRanks.get(right.displayStatus) ?? notUrgentStatusOrder.length);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.name.localeCompare(right.name, "id-ID", { sensitivity: "base" });
  });
}

export function filterAndSortTrackerCards(
  cards: TrackerCardDTO[],
  filters: TrackerFilters,
): TrackerCardDTO[] {
  const filtered = filterTrackerCards(cards, filters);

  switch (filters.sort) {
    case "name-asc":
      return sortTrackerCardsByName(filtered);
    case "name-desc":
      return sortTrackerCardsByNameDesc(filtered);
    case "status-not-urgent":
      return sortTrackerCardsByNotUrgent(filtered);
    case "status-urgent":
    default:
      return sortTrackerCards(filtered);
  }
}

export function getCriticalStatusRank(status: WorkerDisplayStatus): number {
  return criticalStatusRanks.get(status) ?? criticalStatusOrder.length;
}

export function getTrackerRoleTabs(cards: TrackerCardDTO[]): TrackerRoleTab[] {
  const roleCounts = new Map<WorkerRole, number>();

  for (const card of cards) {
    roleCounts.set(card.employeeRole, (roleCounts.get(card.employeeRole) ?? 0) + 1);
  }

  return [
    {
      count: cards.length,
      label: "All",
      shortLabel: "All",
      value: null,
    },
    ...trackerRoleTabDefinitions.map((role) => ({
      count: roleCounts.get(role.value) ?? 0,
      label: role.label,
      shortLabel: role.shortLabel,
      value: role.value,
    })),
  ];
}

export function getTrackerStatusTabs(cards: TrackerCardDTO[]): TrackerStatusTab[] {
  const statusCounts = new Map<WorkerDisplayStatus, number>();

  for (const card of cards) {
    statusCounts.set(
      card.displayStatus,
      (statusCounts.get(card.displayStatus) ?? 0) + 1,
    );
  }

  return trackerStatusTabOrder.map((status) => ({
    count: statusCounts.get(status) ?? 0,
    label: status,
    value: status,
  }));
}

function normalizeQueryParam(value: string | string[] | undefined): string {
  return normalizeSingleParam(value).trim().replace(/\s+/g, " ");
}

function normalizeSingleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
