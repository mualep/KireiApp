import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const actionPath = resolve(projectRoot, "app/admin/(shell)/absensi/actions.ts");
const helperPath = resolve(projectRoot, "lib/absensi/corrections.ts");
const appDir = resolve(projectRoot, "app");

assert.ok(existsSync(actionPath), "Absensi Server Action file must exist.");
assert.ok(existsSync(helperPath), "Absensi correction helper file must exist.");

const actionSource = readFileSync(actionPath, "utf8");
const helperSource = readFileSync(helperPath, "utf8");
const combinedSource = `${actionSource}\n${helperSource}`;

assert.match(actionSource, /^"use server";/);
assertIncludes(actionSource, 'from "next/cache"');
assertIncludes(actionSource, 'from "@/lib/auth/staff"');
assertIncludes(actionSource, "getCurrentStaffUser");
assertIncludes(actionSource, 'from "@/lib/absensi/corrections"');
assertIncludes(actionSource, "applyAbsensiCorrectionMutation");
assertNormalizedIncludes(actionSource, "export async function applyAbsensiCorrection( input: unknown, )");
assertIncludes(actionSource, 'revalidatePath("/admin/absensi")');

assertIncludes(helperSource, 'import "server-only";');
assertIncludes(helperSource, 'from "zod"');
assertIncludes(helperSource, 'from "@/lib/supabase/server"');
assertIncludes(helperSource, "createClient");
assertIncludes(helperSource, "export const absensiCorrectionBeforeStatuses");
assertIncludes(helperSource, "export const absensiCorrectionAfterStatuses");
assertIncludes(helperSource, '"none"');
assertIncludes(helperSource, '"hadir"');
assertIncludes(helperSource, '"cuti"');
assertIncludes(helperSource, '"sakit"');
assertIncludes(helperSource, '"pending"');
assertIncludes(helperSource, '"alpha"');
assertIncludes(helperSource, "z.enum(absensiCorrectionBeforeStatuses)");
assertIncludes(helperSource, "z.enum(absensiCorrectionAfterStatuses)");
assertIncludes(helperSource, "attendanceDate");
assertIncludes(helperSource, "dateParamPattern");
assertIncludes(helperSource, "reason: z.string().trim().min(1).max(500)");
assertIncludes(helperSource, "parsed.data.beforeStatus === parsed.data.afterStatus");
assertIncludes(helperSource, 'parsed.data.beforeStatus === "hadir"');
assertOrderedFragments(helperSource, "parsed.data.beforeStatus === parsed.data.afterStatus", 'supabase.rpc("apply_absensi_correction"');
assertOrderedFragments(helperSource, 'parsed.data.beforeStatus === "hadir"', 'supabase.rpc("apply_absensi_correction"');
assertIncludes(helperSource, 'supabase.rpc("apply_absensi_correction"');
assertIncludes(helperSource, "p_target_user_id: parsed.data.targetUserId");
assertIncludes(helperSource, "p_attendance_date: parsed.data.attendanceDate");
assertIncludes(helperSource, "p_before_status: parsed.data.beforeStatus");
assertIncludes(helperSource, "p_after_status: parsed.data.afterStatus");
assertIncludes(helperSource, "p_expected_attendance_id: parsed.data.expectedAttendanceId");
assertIncludes(helperSource, "p_expected_attendance_updated_at: parsed.data.expectedAttendanceUpdatedAt");
assertIncludes(helperSource, "p_reason: parsed.data.reason");
assertIncludes(helperSource, "attendance_id");
assertIncludes(helperSource, "correction_id");
assertIncludes(helperSource, "audit_id");
assertIncludes(helperSource, "before_status");
assertIncludes(helperSource, "after_status");
assertIncludes(helperSource, "mapAbsensiRpcError(error.message)");

for (const rpcError of [
  "absensi.unauthenticated",
  "absensi.unauthorized",
  "absensi.invalid_input",
  "absensi.invalid_target",
  "absensi.invalid_date",
  "absensi.invalid_transition",
  "absensi.attendance_conflict",
  "absensi.cuti_stock_exhausted",
  "absensi.records_missing",
]) {
  assertIncludes(helperSource, `"${rpcError}"`);
}

assertOrderedFragments(
  actionSource,
  "const result = await applyAbsensiCorrectionMutation(input);",
  'revalidatePath("/admin/absensi")',
);
assertOrderedFragments(
  actionSource,
  "if (!result.ok) {",
  'revalidatePath("/admin/absensi")',
);

assertNoPattern(combinedSource, /\bservice_role\b/i, "Absensi Server Action must not use service-role strings.");
assertNoPattern(combinedSource, /@\/lib\/supabase\/admin|lib\/supabase\/admin/i, "Absensi Server Action must not import the admin Supabase client.");
assertNoPattern(combinedSource, /\.from\(\s*["']worker_status["']\s*\)/i, "Absensi Server Action must not write worker_status directly.");
assertNoPattern(combinedSource, /\.from\(\s*["']worker_(attendance|records|profiles)["']\s*\)/i, "Absensi Server Action must not write worker tables directly.");
assertNoPattern(combinedSource, /\.(insert|update|upsert|delete)\s*\(/i, "Absensi Server Action must delegate mutations to the RPC only.");
assertNoPattern(combinedSource, /apply_tracker_|trackerActions|trackerCorrectionActions/i, "Absensi Server Action must not call tracker actions.");
assertNoPattern(combinedSource, /\bmessage\s*:\s*error\.message\b/i, "Absensi Server Action must not return raw RPC error messages.");
assertNoPattern(combinedSource, /\b(details|hint|sqlstate|code)\s*:\s*error\./i, "Absensi Server Action must not expose raw database error metadata.");
assertNoPattern(combinedSource, /\bthrow\s+error\b/i, "Absensi Server Action must not throw raw RPC errors.");
assert.equal(
  [...actionSource.matchAll(/\.rpc\(\s*["']([^"']+)["']/g)].map((match) => match[1]).join(","),
  "",
  "The route action wrapper should not call Supabase RPCs directly.",
);
assert.deepEqual(
  [...helperSource.matchAll(/\.rpc\(\s*["']([^"']+)["']/g)].map((match) => match[1]),
  ["apply_absensi_correction"],
  "Absensi helper must call only public.apply_absensi_correction.",
);

assert.equal(
  listFiles(appDir).some((filePath) =>
    /\/api\/absensi\/route\.(ts|tsx|js|jsx)$/.test(filePath),
  ),
  false,
  "R3D-B must not add an /api/absensi route handler.",
);

console.log("Absensi correction Server Action static tests passed.");

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function assertNormalizedIncludes(source: string, expected: string) {
  assert.ok(
    normalize(source).includes(normalize(expected)),
    `Expected normalized source to include: ${expected}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function assertOrderedFragments(source: string, first: string, second: string) {
  const normalizedSource = normalize(source);
  const firstIndex = normalizedSource.indexOf(normalize(first));
  const secondIndex = normalizedSource.indexOf(normalize(second));

  assert.notEqual(firstIndex, -1, `Missing ordered fragment: ${first}`);
  assert.notEqual(secondIndex, -1, `Missing ordered fragment: ${second}`);
  assert.ok(firstIndex < secondIndex, `Expected "${first}" before "${second}".`);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
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
