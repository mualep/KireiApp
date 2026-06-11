import { isWorkerRole, type WorkerRole } from "@/lib/workers";
import type { RecordsRowDTO } from "@/lib/records/data";

export type RecordsSearchParams = Record<string, string | string[] | undefined>;

export type RecordsFilters = {
  q: string;
  role: WorkerRole | null;
};

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

export function parseRecordsFilters(
  searchParams: RecordsSearchParams,
): RecordsFilters {
  const q = normalizeQueryParam(searchParams.q);
  const role = normalizeSingleParam(searchParams.role);

  return {
    q: q.slice(0, 80),
    role: isWorkerRole(role) ? role : null,
  };
}

export function hasRecordsFilters(filters: RecordsFilters): boolean {
  return Boolean(filters.q || filters.role);
}

export function filterRecordsRows(
  rows: RecordsRowDTO[],
  filters: RecordsFilters,
): RecordsRowDTO[] {
  const normalizedSearch = filters.q.toLocaleLowerCase("id-ID");

  return rows.filter((row) => {
    if (filters.role && row.employeeRole !== filters.role) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return `${row.name} ${row.gid}`.toLocaleLowerCase("id-ID").includes(normalizedSearch);
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
