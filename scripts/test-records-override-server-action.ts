import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const actionPath = resolve(projectRoot, "app/admin/(shell)/records/actions.ts");
const helperPath = resolve(projectRoot, "lib/records/overrides.ts");

assert.ok(existsSync(actionPath), "Records override Server Action file must exist.");
assert.ok(existsSync(helperPath), "Records override helper file must exist.");

const actionSource = readFileSync(actionPath, "utf8");
const helperSource = readFileSync(helperPath, "utf8");
const combinedSource = `${actionSource}\n${helperSource}`;

assert.match(actionSource, /^"use server";/);
assertIncludes(actionSource, 'from "next/cache"');
assertIncludes(actionSource, 'from "@/lib/auth/staff"');
assertIncludes(actionSource, "getCurrentStaffUser");
assertIncludes(actionSource, 'from "@/lib/records/overrides"');
assertIncludes(actionSource, "applyRecordsOverrideMutation");
assertNormalizedIncludes(actionSource, "export async function applyRecordsOverride(input: unknown)");
assertIncludes(actionSource, 'revalidatePath("/admin/records")');

assertIncludes(helperSource, 'import "server-only";');
assertIncludes(helperSource, 'from "zod"');
assertIncludes(helperSource, 'from "@/lib/supabase/server"');
assertIncludes(helperSource, "createClient");
assertIncludes(helperSource, "targetUserId");
assertIncludes(helperSource, "periodMonth");
assertIncludes(helperSource, "fieldName");
assertIncludes(helperSource, "beforeValue");
assertIncludes(helperSource, "afterValue");
assertIncludes(helperSource, "reason");
assertIncludes(helperSource, "apply_records_override");

for (const rpcError of [
  "records.unauthenticated",
  "records.unauthorized",
  "records.invalid_input",
  "records.invalid_target",
  "records.invalid_value",
  "records.stale_override",
]) {
  assertIncludes(helperSource, `"${rpcError}"`);
}

assertNoPattern(combinedSource, /\bservice_role\b/i, "Server Action must not use service-role strings.");
assertNoPattern(combinedSource, /@\/lib\/supabase\/admin|lib\/supabase\/admin/i, "Server Action must not import the admin Supabase client.");
assertNoPattern(combinedSource, /\.from\(\s*["']worker_status["']\s*\)/i, "Server Action must not write worker_status directly.");
assertNoPattern(combinedSource, /\.(insert|update|upsert|delete)\s*\(/i, "Server Action must delegate mutations to the RPC only.");
assertNoPattern(combinedSource, /\bmessage\s*:\s*error\.message\b/i, "Server Action must not return raw RPC error messages.");

console.log("Records override Server Action static tests passed.");

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

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
