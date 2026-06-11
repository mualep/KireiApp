import { isWorkerRole, type WorkerRole } from "@/lib/workers";
import type { RecordsRowDTO } from "@/lib/records/data";

export type RecordsSearchParams = Record<string, string | string[] | undefined>;

export type RecordsFilters = {
  q: string;
  role: WorkerRole | null;
  sort: RecordsSortOption;
};

export type RecordsSortOption = "name-asc" | "name-desc";

export type RecordsRoleTab = {
  count: number;
  label: string;
  shortLabel: string;
  value: WorkerRole | null;
};

const recordsRoleTabDefinitions = [
  { label: "Professional Player", shortLabel: "PP", value: "Professional Player" },
  { label: "Expert Player", shortLabel: "EP", value: "Expert Player" },
  { label: "Customer Service", shortLabel: "CS", value: "Customer Service" },
  { label: "Explorer", shortLabel: "EX", value: "Explorer" },
  { label: "Security", shortLabel: "SC", value: "Security" },
  { label: "Cleaning Service", shortLabel: "CL", value: "Cleaning Service" },
  { label: "Internship", shortLabel: "IN", value: "Internship" },
] satisfies Array<{ label: string; shortLabel: string; value: WorkerRole }>;

const recordsSortOptions = new Set<RecordsSortOption>(["name-asc", "name-desc"]);

function isRecordsSortOption(value: string): value is RecordsSortOption {
  return recordsSortOptions.has(value as RecordsSortOption);
}

export function parseRecordsFilters(
  searchParams: RecordsSearchParams,
): RecordsFilters {
  const q = normalizeQueryParam(searchParams.q);
  const role = normalizeSingleParam(searchParams.role);
  const sort = normalizeSingleParam(searchParams.sort);

  return {
    q: q.slice(0, 80),
    role: isWorkerRole(role) ? role : null,
    sort: isRecordsSortOption(sort) ? sort : "name-asc",
  };
}

export function hasRecordsFilters(filters: RecordsFilters): boolean {
  return Boolean(filters.q || filters.role || filters.sort !== "name-asc");
}

export function filterRecordsRows(
  rows: RecordsRowDTO[],
  filters: RecordsFilters,
): RecordsRowDTO[] {
  const normalizedSearch = filters.q.toLocaleLowerCase("id-ID");

  const filteredRows = rows.filter((row) => {
    if (filters.role && row.employeeRole !== filters.role) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return row.name.toLocaleLowerCase("id-ID").includes(normalizedSearch);
  });

  return sortRecordsRows(filteredRows, filters.sort);
}

export function sortRecordsRows(
  rows: RecordsRowDTO[],
  sort: RecordsSortOption,
): RecordsRowDTO[] {
  return [...rows].sort((left, right) => {
    const nameDelta = left.name.localeCompare(right.name, "id-ID", {
      sensitivity: "base",
    });
    const resolvedDelta =
      nameDelta !== 0 ? nameDelta : left.userId.localeCompare(right.userId);

    return sort === "name-desc" ? -resolvedDelta : resolvedDelta;
  });
}

export function getRecordsRoleTabs(rows: RecordsRowDTO[]): RecordsRoleTab[] {
  const roleCounts = new Map<WorkerRole, number>();

  for (const row of rows) {
    roleCounts.set(row.employeeRole, (roleCounts.get(row.employeeRole) ?? 0) + 1);
  }

  return [
    {
      count: rows.length,
      label: "All",
      shortLabel: "All",
      value: null,
    },
    ...recordsRoleTabDefinitions.map((role) => ({
      count: roleCounts.get(role.value) ?? 0,
      label: role.label,
      shortLabel: role.shortLabel,
      value: role.value,
    })),
  ];
}

function normalizeQueryParam(value: string | string[] | undefined): string {
  return normalizeSingleParam(value).trim().replace(/\s+/g, " ");
}

function normalizeSingleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
