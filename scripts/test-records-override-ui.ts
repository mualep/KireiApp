import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const recordsPagePath = resolve(projectRoot, "app/admin/(shell)/records/page.tsx");
const dialogPath = resolve(projectRoot, "components/admin/records/records-override-dialog.tsx");
const tablePath = resolve(projectRoot, "components/admin/records/records-table.tsx");
const componentsDir = resolve(projectRoot, "components/admin/records");

assert.ok(existsSync(recordsPagePath), "Records page must exist.");
assert.ok(existsSync(dialogPath), "Records override dialog must exist.");
assert.ok(existsSync(tablePath), "Records table component must exist.");

const pageSource = readFileSync(recordsPagePath, "utf8");
const dialogSource = readFileSync(dialogPath, "utf8");
const tableSource = readFileSync(tablePath, "utf8");
const componentSources = listFiles(componentsDir)
  .filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const uiSources = [pageSource, dialogSource, componentSources].join("\n");

// Page wires admin guard correctly
assertIncludes(pageSource, "canCorrectRecords");
assertIncludes(componentSources, "RecordsOverrideDialog");

// Dialog must be a client component with expected exports
assert.match(dialogSource, /^"use client";/);
assertIncludes(dialogSource, "RecordsOverrideDialog");
assertIncludes(dialogSource, "applyRecordsOverride");
assertIncludes(dialogSource, "useTransition");

// QA Polish: dialog receives full row object (bugfix from R3-RO-Bugfix)
assertIncludes(dialogSource, "row: RecordsRowDTO", "Dialog must accept full RecordsRowDTO row prop.");
// QA Polish: periodMonth formatted to first-of-month YYYY-MM-DD for Zod validation
assertIncludes(dialogSource, "`${periodMonth}-01`", "periodMonth must be formatted as YYYY-MM-01.");
// QA Polish: duration fields use H+M inputs (not raw seconds)
assertIncludes(dialogSource, "afterHours", "Dialog must have afterHours state for duration fields.");
assertIncludes(dialogSource, "afterMinutes", "Dialog must have afterMinutes state for duration fields.");
// R3-RO-Final: Clear override button with canonical label
assertIncludes(
  dialogSource,
  "Batal Override (Kembali Otomatis)",
  "Clear override button must use canonical label.",
);

// QA Polish: Override badge removed from table MetricValue
assertNoPattern(
  tableSource,
  /metric\.isOverride/,
  "MetricValue in records-table must not reference metric.isOverride (Override badge removed).",
);
// QA Polish: Action column hidden (not just disabled) for non-admins
assertIncludes(tableSource, "canCorrectRecords ? (", "Action column must be conditionally hidden.");

// Security: no direct Supabase calls from UI layer
assertNoPattern(
  uiSources,
  /@\/lib\/supabase|createClient|\.rpc\s*\(/,
  "Client UI must not import Supabase or call RPC directly.",
);
assertNoPattern(
  uiSources,
  /\.(insert|update|upsert|delete)\s*\(/i,
  "Client UI must not write tables directly.",
);

console.log("Records override UI static tests passed.");

function assertIncludes(source: string, expected: string, message?: string) {
  assert.ok(
    source.includes(expected),
    message ?? `Expected source to include: ${expected}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
