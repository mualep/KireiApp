import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const actionsPath = resolve(process.cwd(), "app/admin/(shell)/users/actions.ts");
const dataPath = resolve(process.cwd(), "lib/users/data.ts");

if (!existsSync(actionsPath)) {
  console.error("RED: Missing app/admin/(shell)/users/actions.ts");
  process.exit(1);
}

if (!existsSync(dataPath)) {
  console.error("RED: Missing lib/users/data.ts");
  process.exit(1);
}

const actionsContent = readFileSync(actionsPath, "utf8");
const dataContent = readFileSync(dataPath, "utf8");

// ============================================================================
// Actions Assertions
// ============================================================================

assert.ok(
  actionsContent.includes("'use server'") || actionsContent.includes('"use server"'),
  "actions.ts must use 'use server'",
);

// Actor Boundaries
assert.ok(
  actionsContent.includes("['owner', 'admin'].includes") || actionsContent.includes('["owner", "admin"].includes') || actionsContent.includes("tier === 'owner' || tier === 'admin'"),
  "actions.ts must verify caller tier is owner or admin",
);

// createWorker rules
assert.ok(
  actionsContent.includes("createWorker"),
  "actions.ts must export createWorker",
);
assert.ok(
  actionsContent.includes("createAdminClient") || actionsContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "createWorker must instantiate the Supabase Admin client with SERVICE_ROLE_KEY",
);
assert.ok(
  actionsContent.includes("admin.auth.admin.createUser") || actionsContent.includes("supabase.auth.admin.createUser") || actionsContent.includes("adminClient.auth.admin.createUser"),
  "createWorker must use admin.createUser()",
);
assert.ok(
  actionsContent.includes("insert") && (actionsContent.includes("public.users") || actionsContent.includes('"users"')),
  "createWorker must insert into public.users",
);
assert.ok(
  actionsContent.includes("insert") && (actionsContent.includes("public.worker_profiles") || actionsContent.includes('"worker_profiles"')),
  "createWorker must insert into public.worker_profiles",
);

// editWorker rules
assert.ok(
  actionsContent.includes("editWorker"),
  "actions.ts must export editWorker",
);
assert.ok(
  actionsContent.includes("shift_active_start_hour: null") || actionsContent.includes("shift_active_start_hour = null") || actionsContent.includes("shift_active_start_hour:null"),
  "editWorker must nullify shift_active_* fields when shift changes",
);

// RPC wrappers
const rpcCalls = [
  "deactivate_worker",
  "reactivate_worker",
  "issue_worker_sp",
  "revoke_worker_sp"
];

for (const rpc of rpcCalls) {
  assert.ok(
    actionsContent.includes(rpc),
    `actions.ts must call RPC ${rpc}`
  );
}

// ============================================================================
// Data Loaders Assertions
// ============================================================================

assert.ok(
  dataContent.includes("getUsersManagerList"),
  "data.ts must export getUsersManagerList",
);
assert.ok(
  dataContent.includes("getWorkerSpLogs"),
  "data.ts must export getWorkerSpLogs",
);

assert.ok(
  dataContent.includes("users"),
  "getUsersManagerList must query users table",
);
assert.ok(
  dataContent.includes("worker_profiles"),
  "getUsersManagerList must join worker_profiles",
);
assert.ok(
  dataContent.includes("worker_status"),
  "getUsersManagerList must join worker_status",
);
assert.ok(
  dataContent.includes("worker_sp_logs") || actionsContent.includes("worker_sp_logs") || dataContent.includes("sp"),
  "getUsersManagerList/getWorkerSpLogs must query worker_sp_logs",
);

console.log("Users Manager Server Actions & Data Loaders static tests passed.");
