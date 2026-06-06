import { isWorkerRole, type WorkerRole } from "@/lib/workers";
import type { AbsensiWorkerRowDTO } from "@/lib/absensi/data";

export type AbsensiSearchParams = Record<string, string | string[] | undefined>;

export type AbsensiFilters = {
  q: string;
  role: WorkerRole | null;
};

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

export function parseAbsensiFilters(
  searchParams: AbsensiSearchParams,
): AbsensiFilters {
  const q = normalizeQueryParam(searchParams.q);
  const role = normalizeSingleParam(searchParams.role);

  return {
    q: q.slice(0, 80),
    role: isWorkerRole(role) ? role : null,
  };
}

export function hasAbsensiFilters(filters: AbsensiFilters): boolean {
  return Boolean(filters.q || filters.role);
}

export function filterAbsensiRows(
  rows: AbsensiWorkerRowDTO[],
  filters: AbsensiFilters,
): AbsensiWorkerRowDTO[] {
  const normalizedSearch = filters.q.toLocaleLowerCase("id-ID");

  return rows.filter((row) => {
    if (filters.role && row.employeeRole !== filters.role) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return row.name.toLocaleLowerCase("id-ID").includes(normalizedSearch);
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
