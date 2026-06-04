import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const contractPath = resolve(
  projectRoot,
  "docs/plans/release-3b-absensi-correction-contract.md",
);
const absensiPagePath = resolve(projectRoot, "app/admin/(shell)/absensi/page.tsx");
const absensiDataPath = resolve(projectRoot, "lib/absensi/data.ts");
const absensiHelpersPath = resolve(projectRoot, "lib/absensi/helpers.ts");
const absensiComponentsDir = resolve(projectRoot, "components/admin/absensi");
const packageJsonPath = resolve(projectRoot, "package.json");

assert.ok(existsSync(contractPath), "R3B Absensi correction contract must exist.");

const contractSource = readFileSync(contractPath, "utf8");
const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const absensiSources = [
  readFileSync(absensiPagePath, "utf8"),
  readFileSync(absensiDataPath, "utf8"),
  readFileSync(absensiHelpersPath, "utf8"),
  ...readComponentSources(),
].join("\n");

assertIncludes(packageJsonSource, '"test:absensi-correction-contract"');

for (const required of [
  "R3A Absensi remains read-only",
  "PRD v1 remains frozen",
  "Owner and Admin are the only future actors allowed to correct Absensi attendance",
  "Member remains self-only and read-only for Absensi",
  "Member can read only their own Absensi data",
  "Authenticated Customer remains out of PRD v1",
  "`hadir`",
  "`cuti`",
  "`sakit`",
  "`pending`",
  "`alpha`",
  "Tracker must not create, correct, or recover `alpha`",
  "`LATE` is derived-only and must never be stored as an attendance status",
  "`worker_attendance` remains the daily attendance source of truth",
  "Corrected attendance rows should use `source = 'absensi'`",
  "Rows must not be physically deleted",
  "`worker_records.sakit_days`",
  "`worker_records.pending_days`",
  "`worker_records.alpha_count`",
  "`worker_profiles.cuti_stock`",
  "Override fields in `worker_records` must not be overwritten blindly",
  "Audit failure must fail closed",
  "Actor user id",
  "Target worker user id",
  "Before and after attendance status",
  "Worker record deltas",
  "No service-role or admin Supabase client in app code",
  "RLS remains restrictive for direct table access",
  "No Server Action in R3B",
  "No RPC mutation in R3B",
  "No schema or migration in R3B",
]) {
  assertIncludes(contractSource, required);
}

assertNoPattern(contractSource, /\bTODO\b|\bTBD\b/i);

assertNoPattern(absensiSources, /\b(use server|revalidatePath)\b/);
assertNoPattern(absensiSources, /\.rpc\s*\(/);
assertNoPattern(absensiSources, /\.(insert|update|upsert|delete)\s*\(/);
assertNoPattern(absensiSources, /\b(service_role|SERVICE_ROLE|createAdminClient)\b/);
assertNoPattern(absensiSources, /\b(BATAL|Correction|Koreksi|Edit|Save|Reset)\b/i);

console.log("Absensi correction contract tests passed.");

function readComponentSources() {
  if (!existsSync(absensiComponentsDir)) {
    return [];
  }

  return readdirSync(absensiComponentsDir)
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => readFileSync(join(absensiComponentsDir, entry), "utf8"));
}

function assertIncludes(source: string, expected: string) {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp) {
  assert.equal(
    pattern.test(source),
    false,
    `Source must not match forbidden pattern: ${pattern}`,
  );
}
