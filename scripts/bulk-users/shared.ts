import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const bulkUsersCsvPath = ".local/bulk-user-bootstrap-preview.csv";

export const expectedHeader = [
  "name",
  "email",
  "password",
  "tier",
  "is_deleted",
  "avatar_initials",
  "employee_role",
  "shift",
  "shift_start",
  "shift_end",
  "is_flexible",
  "show_card",
  "cuti_stock",
] as const;

export type ColumnName = (typeof expectedHeader)[number];
export type BulkUserRow = Record<ColumnName, string>;

export type RowRef = {
  name: string;
  email: string;
};

export type ValidationIssue = {
  check: string;
  message: string;
  row?: RowRef;
};

export type ChecklistItem = {
  label: string;
  pass: boolean;
};

export type BulkUserValidationResult = {
  sourcePath: string;
  rows: BulkUserRow[];
  workers: BulkUserRow[];
  owners: BulkUserRow[];
  checklist: ChecklistItem[];
  issues: ValidationIssue[];
};

type LoadResult =
  | {
      ok: true;
      result: BulkUserValidationResult;
    }
  | {
      ok: false;
      message: string;
    };

const expectedTierCounts = {
  owner: 2,
  admin: 3,
  member: 72,
} as const;

const expectedRoleCounts = {
  "Professional Player": 30,
  Internship: 31,
  "Expert Player": 8,
  "Customer Service": 3,
  Explorer: 1,
  Security: 1,
  "Cleaning Service": 1,
} as const;

const expectedShiftCounts = {
  A: 11,
  B: 10,
  C: 11,
  D: 8,
  E: 12,
  F: 9,
  "1": 3,
  "2": 4,
  "3": 4,
  flexible: 3,
} as const;

const validTiers = new Set(["owner", "admin", "member"]);
const validShifts = new Set(Object.keys(expectedShiftCounts));
const expectedFlexibleNames = new Set(["EDI", "ANGGA", "REGA"]);
const ownerWorkerProfileFields = [
  "employee_role",
  "shift",
  "shift_start",
  "shift_end",
  "is_flexible",
  "show_card",
  "cuti_stock",
] as const satisfies readonly ColumnName[];

export function loadAndValidateBulkUsers(sourcePath = bulkUsersCsvPath): LoadResult {
  const absoluteCsvPath = resolve(process.cwd(), sourcePath);

  if (!existsSync(absoluteCsvPath)) {
    return {
      ok: false,
      message: `Bulk user CSV not found at ${sourcePath}. This file is local-only and must be created before running this command.`,
    };
  }

  const csvText = readFileSync(absoluteCsvPath, "utf8");
  return {
    ok: true,
    result: validateBulkUsersCsvText(csvText, sourcePath),
  };
}

export function validateBulkUsersCsvText(csvText: string, sourcePath = bulkUsersCsvPath): BulkUserValidationResult {
  const parsed = parseCsv(csvText);
  const [header = [], ...records] = parsed;
  const issues: ValidationIssue[] = [];

  const headerMatches =
    header.length === expectedHeader.length &&
    expectedHeader.every((column, index) => header[index] === column);

  if (!headerMatches) {
    issues.push({
      check: "header",
      message: `Expected header columns: ${expectedHeader.join(", ")}`,
    });
  }

  const rows = headerMatches ? toRows(records, issues) : [];
  const workers = rows.filter((row) => row.tier !== "owner");
  const owners = rows.filter((row) => row.tier === "owner");

  const checklist: ChecklistItem[] = [
    check("header columns", headerMatches),
    check("total rows = 77", rows.length === 77, issues, "row-count", `Found ${rows.length} data rows.`),
    check("owners = 2", owners.length === 2, issues, "owner-count", `Found ${owners.length} owner rows.`),
    check("workers = 75", workers.length === 75, issues, "worker-count", `Found ${workers.length} worker rows.`),
    checkCounts("tier counts", countBy(rows, "tier"), expectedTierCounts, issues),
    checkCounts("role counts", countBy(workers, "employee_role"), expectedRoleCounts, issues),
    checkCounts("shift counts", countBy(workers, "shift"), expectedShiftCounts, issues),
    checkUniqueEmails(rows, issues),
    checkValidTiers(rows, issues),
    checkValidShifts(workers, issues),
    checkCustomerServiceTier(workers, issues),
    checkNonCustomerServiceTier(workers, issues),
    checkFlexibleRows(workers, issues),
    checkOwnerWorkerFields(owners, issues),
    checkAvatarInitials(rows, issues),
    checkPasswordColumn(rows, issues),
  ];

  return {
    sourcePath,
    rows,
    workers,
    owners,
    checklist,
    issues,
  };
}

export function printRedactedValidationSummary(
  result: BulkUserValidationResult,
  title = "Bulk user bootstrap dry-run validation",
) {
  const { rows, workers, checklist, issues } = result;

  console.log(title);
  console.log(`Source: ${result.sourcePath}`);
  console.log("Passwords: [REDACTED; values are never printed]");
  console.log("");
  console.log("Counts:");
  console.log(`- total auth users: ${rows.length}`);
  console.log(`- owners: ${rows.filter((row) => row.tier === "owner").length}`);
  console.log(`- workers: ${workers.length}`);
  console.log(`- tiers: ${formatCounts(countBy(rows, "tier"))}`);
  console.log(`- roles: ${formatCounts(countBy(workers, "employee_role"))}`);
  console.log(`- shifts: ${formatCounts(countBy(workers, "shift"))}`);
  console.log("");
  console.log("Checklist:");

  for (const item of checklist) {
    console.log(`- ${item.pass ? "PASS" : "FAIL"} ${item.label}`);
  }

  console.log("");

  if (issues.length === 0) {
    console.log("Result: PASS");
    return;
  }

  console.log("Errors:");
  for (const issue of issues) {
    const row = issue.row
      ? ` name=${issue.row.name || "(blank)"} email=${issue.row.email || "(blank)"}`
      : "";
    console.log(`- ${issue.check}: ${issue.message}${row}`);
  }
  console.log("Result: FAIL");
}

export function hasValidationIssues(result: BulkUserValidationResult) {
  return result.issues.length > 0;
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toRows(records: string[][], issues: ValidationIssue[]) {
  return records.flatMap((record) => {
    if (record.length !== expectedHeader.length) {
      issues.push({
        check: "record-width",
        message: `Found a row with ${record.length} columns; expected ${expectedHeader.length}.`,
        row: {
          name: record[0] ?? "",
          email: record[1] ?? "",
        },
      });
      return [];
    }

    return [
      Object.fromEntries(expectedHeader.map((column, index) => [column, record[index] ?? ""])) as BulkUserRow,
    ];
  });
}

function check(
  label: string,
  pass: boolean,
  issues?: ValidationIssue[],
  issueCheck?: string,
  message?: string,
) {
  if (!pass && issues && issueCheck && message) {
    issues.push({ check: issueCheck, message });
  }

  return { label, pass };
}

function checkCounts(
  label: string,
  actual: Record<string, number>,
  expected: Record<string, number>,
  issues: ValidationIssue[],
) {
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  const pass =
    sameValues(actualKeys, expectedKeys) &&
    expectedKeys.every((key) => actual[key] === expected[key]);

  if (!pass) {
    issues.push({
      check: label,
      message: `Expected ${formatCounts(expected)}; found ${formatCounts(actual)}.`,
    });
  }

  return { label, pass };
}

function checkUniqueEmails(rows: BulkUserRow[], issues: ValidationIssue[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.email)) {
      duplicates.add(row.email);
      issues.push({
        check: "unique emails",
        message: "Duplicate email found.",
        row: rowRef(row),
      });
    }
    seen.add(row.email);
  }

  return { label: "unique emails", pass: duplicates.size === 0 };
}


function checkValidTiers(rows: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = rows.filter((row) => !validTiers.has(row.tier));

  for (const row of invalidRows) {
    issues.push({
      check: "valid tiers",
      message: "Invalid tier found.",
      row: rowRef(row),
    });
  }

  return { label: "valid tiers only", pass: invalidRows.length === 0 };
}

function checkValidShifts(workers: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = workers.filter((row) => !validShifts.has(row.shift));

  for (const row of invalidRows) {
    issues.push({
      check: "valid shifts",
      message: "Invalid worker shift found.",
      row: rowRef(row),
    });
  }

  return { label: "valid shifts only", pass: invalidRows.length === 0 };
}

function checkCustomerServiceTier(workers: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = workers.filter((row) => row.employee_role === "Customer Service" && row.tier !== "admin");

  for (const row of invalidRows) {
    issues.push({
      check: "Customer Service tier",
      message: "Customer Service worker must have tier=admin.",
      row: rowRef(row),
    });
  }

  return { label: "Customer Service rows have tier=admin", pass: invalidRows.length === 0 };
}

function checkNonCustomerServiceTier(workers: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = workers.filter((row) => row.employee_role !== "Customer Service" && row.tier !== "member");

  for (const row of invalidRows) {
    issues.push({
      check: "non-Customer-Service tier",
      message: "Non-Customer-Service worker must have tier=member.",
      row: rowRef(row),
    });
  }

  return { label: "non-Customer-Service worker rows have tier=member", pass: invalidRows.length === 0 };
}

function checkFlexibleRows(workers: BulkUserRow[], issues: ValidationIssue[]) {
  const flexibleRows = workers.filter((row) => row.shift === "flexible");
  const flexibleNames = new Set(flexibleRows.map((row) => row.name));
  const namesPass =
    flexibleRows.length === expectedFlexibleNames.size &&
    [...expectedFlexibleNames].every((name) => flexibleNames.has(name));
  const fieldsPass = flexibleRows.every(
    (row) => row.is_flexible === "true" && row.shift_start === "" && row.shift_end === "",
  );

  if (!namesPass) {
    issues.push({
      check: "flexible rows",
      message: `Expected flexible rows exactly: ${[...expectedFlexibleNames].join(", ")}.`,
    });
  }

  for (const row of flexibleRows) {
    if (!expectedFlexibleNames.has(row.name)) {
      issues.push({
        check: "flexible rows",
        message: "Unexpected flexible worker found.",
        row: rowRef(row),
      });
    }

    if (row.is_flexible !== "true" || row.shift_start !== "" || row.shift_end !== "") {
      issues.push({
        check: "flexible row fields",
        message: "Flexible worker must use is_flexible=true with empty shift_start and shift_end.",
        row: rowRef(row),
      });
    }
  }

  return { label: "flexible rows exactly EDI, ANGGA, REGA with empty shift times", pass: namesPass && fieldsPass };
}

function checkOwnerWorkerFields(owners: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = owners.filter((row) => ownerWorkerProfileFields.some((field) => row[field] !== ""));

  for (const row of invalidRows) {
    issues.push({
      check: "owner worker profile fields",
      message: "Owner row must leave worker profile fields blank.",
      row: rowRef(row),
    });
  }

  return { label: "owner rows have blank worker profile fields", pass: invalidRows.length === 0 };
}

function checkAvatarInitials(rows: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = rows.filter((row) => !/^[A-Z]{2}$/.test(row.avatar_initials));

  for (const row of invalidRows) {
    issues.push({
      check: "avatar initials",
      message: "Avatar initials must be exactly two uppercase letters.",
      row: rowRef(row),
    });
  }

  return { label: "avatar_initials are two uppercase letters", pass: invalidRows.length === 0 };
}

function checkPasswordColumn(rows: BulkUserRow[], issues: ValidationIssue[]) {
  const invalidRows = rows.filter((row) => row.password === "");

  for (const row of invalidRows) {
    issues.push({
      check: "password column",
      message: "Password column must be present and non-empty; value redacted.",
      row: rowRef(row),
    });
  }

  return { label: "password column present and never printed", pass: invalidRows.length === 0 };
}

function countBy(rows: BulkUserRow[], field: ColumnName) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = row[field] || "(blank)";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

function rowRef(row: BulkUserRow): RowRef {
  return {
    name: row.name,
    email: row.email,
  };
}

function sameValues(actual: string[], expected: string[]) {
  if (actual.length !== expected.length) {
    return false;
  }

  return actual.every((value, index) => value === expected[index]);
}

function formatCounts(counts: Record<string, number>) {
  return Object.keys(counts)
    .sort()
    .map((key) => `${key} ${counts[key]}`)
    .join(", ");
}
