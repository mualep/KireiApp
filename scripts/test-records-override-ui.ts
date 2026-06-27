import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const recordsPagePath = resolve(projectRoot, "app/admin/(shell)/records/page.tsx");
const dialogPath = resolve(projectRoot, "components/admin/records/records-override-dialog.tsx");
const componentsDir = resolve(projectRoot, "components/admin/records");

assert.ok(existsSync(recordsPagePath), "Records page must exist.");
assert.ok(existsSync(dialogPath), "Records override dialog must exist.");

const pageSource = readFileSync(recordsPagePath, "utf8");
const dialogSource = readFileSync(dialogPath, "utf8");
const componentSources = listFiles(componentsDir)
  .filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const uiSources = [pageSource, dialogSource, componentSources].join("\n");

assertIncludes(pageSource, "canCorrectRecords");
assertIncludes(componentSources, "RecordsOverrideDialog");

assert.match(dialogSource, /^"use client";/);
assertIncludes(dialogSource, "RecordsOverrideDialog");
assertIncludes(dialogSource, "applyRecordsOverride");
assertIncludes(dialogSource, "useTransition");

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

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
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
