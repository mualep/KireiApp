import { isWorkerRole, type WorkerRole, isWorkerShift, type WorkerShift } from "@/lib/workers";
import type { AbsensiWorkerRowDTO } from "@/lib/absensi/data";

export type AbsensiSearchParams = Record<string, string | string[] | undefined>;

export type AbsensiFilters = {
  q: string;
  role: WorkerRole | null;
  shift: WorkerShift | null;
  sort: AbsensiSortOption;
};

export type AbsensiSortOption = "name-asc" | "name-desc";

export type AbsensiRoleTab = {
  count: number;
  label: string;
  shortLabel: string;
  value: WorkerRole | null;
};

const absensiRoleTabDefinitions = [
  { label: "Professional Player", shortLabel: "PP", value: "Professional Player" },
  { label: "Expert Player", shortLabel: "EP", value: "Expert Player" },
  { label: "Customer Service", shortLabel: "CS", value: "Customer Service" },
  { label: "Explorer", shortLabel: "EX", value: "Explorer" },
  { label: "Security", shortLabel: "SC", value: "Security" },
  { label: "Cleaning Service", shortLabel: "CL", value: "Cleaning Service" },
  { label: "Internship", shortLabel: "IN", value: "Internship" },
] satisfies Array<{ label: string; shortLabel: string; value: WorkerRole }>;

const absensiSortOptions = new Set<AbsensiSortOption>(["name-asc", "name-desc"]);

function isAbsensiSortOption(value: string): value is AbsensiSortOption {
  return absensiSortOptions.has(value as AbsensiSortOption);
}

export function parseAbsensiFilters(
  searchParams: AbsensiSearchParams,
): AbsensiFilters {
  const q = normalizeQueryParam(searchParams.q);
  const role = normalizeSingleParam(searchParams.role);
  const shift = normalizeSingleParam(searchParams.shift);
  const sort = normalizeSingleParam(searchParams.sort);

  return {
    q: q.slice(0, 80),
    role: isWorkerRole(role) ? role : null,
    shift: isWorkerShift(shift) ? shift : null,
    sort: isAbsensiSortOption(sort) ? sort : "name-asc",
  };
}

export function hasAbsensiFilters(filters: AbsensiFilters): boolean {
  return Boolean(filters.q || filters.role || filters.shift || filters.sort !== "name-asc");
}

export function filterAbsensiRows(
  rows: AbsensiWorkerRowDTO[],
  filters: AbsensiFilters,
): AbsensiWorkerRowDTO[] {
  const normalizedSearch = filters.q.toLocaleLowerCase("id-ID");

  const filteredRows = rows.filter((row) => {
    if (filters.role && row.employeeRole !== filters.role) {
      return false;
    }

    if (filters.shift && row.shift !== filters.shift) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return row.name.toLocaleLowerCase("id-ID").includes(normalizedSearch);
  });

  return sortAbsensiRows(filteredRows, filters.sort);
}

export function sortAbsensiRows(
  rows: AbsensiWorkerRowDTO[],
  sort: AbsensiSortOption,
): AbsensiWorkerRowDTO[] {
  return [...rows].sort((left, right) => {
    const nameDelta = left.name.localeCompare(right.name, "id-ID", {
      sensitivity: "base",
    });
    const resolvedDelta =
      nameDelta !== 0 ? nameDelta : left.userId.localeCompare(right.userId);

    return sort === "name-desc" ? -resolvedDelta : resolvedDelta;
  });
}

export function getAbsensiRoleTabs(rows: AbsensiWorkerRowDTO[]): AbsensiRoleTab[] {
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
    ...absensiRoleTabDefinitions.map((role) => ({
      count: roleCounts.get(role.value) ?? 0,
      label: role.label,
      shortLabel: role.shortLabel,
      value: role.value,
    })),
  ];
}

export function getAbsensiRoleShortLabel(role: WorkerRole): string {
  return (
    absensiRoleTabDefinitions.find((definition) => definition.value === role)
      ?.shortLabel ?? role
  );
}

function normalizeQueryParam(value: string | string[] | undefined): string {
  return normalizeSingleParam(value).trim().replace(/\s+/g, " ");
}

function normalizeSingleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
