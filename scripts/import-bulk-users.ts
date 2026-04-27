import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type BulkUserRow,
  hasValidationIssues,
  loadAndValidateBulkUsers,
  printRedactedValidationSummary,
} from "./bulk-users/shared";
import { parseShiftTime, validateWorkerProfileInput } from "../lib/workers";

const executeFlag = "--execute";
const allowedFlags = new Set([executeFlag]);
const args = process.argv.slice(2);
const unknownFlags = args.filter((arg) => arg.startsWith("-") && !allowedFlags.has(arg));
const shouldExecute = args.includes(executeFlag);
const localExecuteConfirmation = "CREATE_77_LOCAL_USERS";
type BootstrapTable<Row extends Record<string, unknown>, Insert extends Record<string, unknown> = Row> = {
  Insert: Insert;
  Relationships: [];
  Row: Row;
  Update: Partial<Insert>;
};
type BootstrapDatabase = {
  public: {
    Functions: {
      write_audit_log: {
        Args: {
          p_action: string;
          p_domain: string;
          p_payload?: Record<string, unknown>;
          p_target_id?: string | null;
          p_target_table?: string | null;
          p_target_user_id?: string | null;
        };
        Returns: string;
      };
    };
    Tables: {
      audit_logs: BootstrapTable<{ id: string }>;
      users: BootstrapTable<{
        email: string;
        id: string;
        is_deleted: boolean;
        name: string;
        tier: string;
      }>;
      worker_profiles: BootstrapTable<{
        cuti_stock: number;
        employee_role: string;
        gid: string;
        is_flexible: boolean;
        shift: string;
        shift_end_hour: number | null;
        shift_end_min: number | null;
        shift_start_hour: number | null;
        shift_start_min: number | null;
        show_card: boolean;
        user_id: string;
      }>;
      worker_status: BootstrapTable<{
        current_status: string;
        user_id: string;
      }>;
    };
    Views: Record<string, never>;
  };
};
type SupabaseAdminClient = SupabaseClient<BootstrapDatabase, "public", "public">;

void main();

async function main() {
  if (unknownFlags.length > 0) {
    console.error(`Unknown flag(s): ${unknownFlags.join(", ")}`);
    process.exit(1);
  }

  const loaded = loadAndValidateBulkUsers();

  if (!loaded.ok) {
    console.error(loaded.message);
    process.exit(1);
  }

  printRedactedValidationSummary(
    loaded.result,
    shouldExecute ? "Bulk user bootstrap import validation" : "Bulk user bootstrap import dry-run",
  );

  if (hasValidationIssues(loaded.result)) {
    process.exit(1);
  }

  if (!shouldExecute) {
    console.log("");
    console.log("Mode: dry-run/read-only");
    console.log("Supabase Admin API: not called");
    console.log("Database writes: not attempted");
    process.exit(0);
  }

  console.log("");
  console.log("Mode: execute requested");

  const schemaStatus = inspectMigrationSchema();

  if (schemaStatus.missingEntities.length > 0) {
    console.error("Execution blocked: current migrations do not create every entity required for bulk worker bootstrap.");
    console.error(`Missing entity/entities: ${schemaStatus.missingEntities.join(", ")}`);
    console.error("Release 2A worker tables and audit RPC must exist before this script can write application rows.");
    console.error("Supabase Admin API: not called");
    console.error("Database writes: not attempted");
    process.exit(1);
  }

  const missingEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    console.error(`Execution blocked: missing required environment variable(s): ${missingEnvVars.join(", ")}`);
    console.error("Supabase Admin API: not called");
    console.error("Database writes: not attempted");
    process.exit(1);
  }

  if (process.env.KIREIKU_BULK_IMPORT_CONFIRM !== localExecuteConfirmation) {
    console.error(
      `Execution blocked: set KIREIKU_BULK_IMPORT_CONFIRM=${localExecuteConfirmation} to confirm local/dev bootstrap writes.`,
    );
    console.error("Supabase Admin API: not called");
    console.error("Database writes: not attempted");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!isLocalSupabaseUrl(supabaseUrl)) {
    console.error("Execution blocked: NEXT_PUBLIC_SUPABASE_URL must point to a local Supabase instance.");
    console.error("Remote Supabase URLs are blocked by default for this bootstrap script.");
    console.error("Supabase Admin API: not called");
    console.error("Database writes: not attempted");
    process.exit(1);
  }

  const adminClient: SupabaseAdminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  try {
    await assertDatabaseEntitiesExist(adminClient);
    const result = await executeBulkImport(adminClient, loaded.result.rows);

    console.log("");
    console.log("Execution completed.");
    console.log(`- auth users created: ${result.createdAuthUsers}`);
    console.log(`- auth users reused: ${result.reusedAuthUsers}`);
    console.log(`- app users upserted: ${result.upsertedAppUsers}`);
    console.log(`- worker profiles upserted: ${result.upsertedWorkerProfiles}`);
    console.log(`- worker statuses created: ${result.createdWorkerStatuses}`);
    console.log(`- worker statuses reused: ${result.reusedWorkerStatuses}`);
  } catch (error) {
    console.error("");
    console.error(error instanceof Error ? error.message : "Execution failed.");
    console.error("Passwords: [REDACTED; values are never printed]");
    process.exit(1);
  }
}

function inspectMigrationSchema() {
  const migrationSql = readMigrationSql();
  const requiredTables = ["public.users", "public.worker_profiles", "public.worker_status", "public.audit_logs"];
  const requiredFunctions = ["public.write_audit_log"];
  const presentTables = requiredTables.filter((table) => migrationCreatesTable(migrationSql, table));
  const presentFunctions = requiredFunctions.filter((fn) => migrationCreatesFunction(migrationSql, fn));
  const missingTables = requiredTables.filter((table) => !presentTables.includes(table));
  const missingFunctions = requiredFunctions.filter((fn) => !presentFunctions.includes(fn));

  return {
    missingEntities: [...missingTables, ...missingFunctions],
    missingFunctions,
    missingTables,
    presentFunctions,
    requiredTables,
    requiredFunctions,
    presentTables,
  };
}

function readMigrationSql() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");

  if (!existsSync(migrationsDir)) {
    return "";
  }

  return readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .map((entry) => {
      const filePath = join(migrationsDir, entry);
      return statSync(filePath).isFile() ? readFileSync(filePath, "utf8") : "";
    })
    .join("\n");
}

function migrationCreatesTable(sql: string, table: string) {
  const [schema, tableName] = table.split(".");
  const escapedSchema = escapeRegExp(schema ?? "");
  const escapedTableName = escapeRegExp(tableName ?? "");
  const pattern = new RegExp(
    String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${escapedSchema}\.${escapedTableName}\b`,
    "i",
  );

  return pattern.test(sql);
}

function migrationCreatesFunction(sql: string, fn: string) {
  const [schema, functionName] = fn.split(".");
  const escapedSchema = escapeRegExp(schema ?? "");
  const escapedFunctionName = escapeRegExp(functionName ?? "");
  const pattern = new RegExp(
    String.raw`create\s+(?:or\s+replace\s+)?function\s+${escapedSchema}\.${escapedFunctionName}\s*\(`,
    "i",
  );

  return pattern.test(sql);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLocalSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function assertDatabaseEntitiesExist(adminClient: SupabaseAdminClient) {
  for (const table of ["users", "worker_profiles", "worker_status", "audit_logs"]) {
    const { error } = await adminClient.from(table).select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Execution blocked: database table public.${table} is not accessible.`);
    }
  }

  const { error: rpcError } = await adminClient.rpc("write_audit_log", {
    p_action: "bulk_users.preflight",
    p_domain: "worker_import",
    p_payload: {
      mode: "preflight",
    },
    p_target_id: null,
    p_target_table: null,
    p_target_user_id: null,
  });

  if (!rpcError) {
    return;
  }

  if (!String(rpcError.message).toLowerCase().includes("unauthenticated")) {
    throw new Error("Execution blocked: public.write_audit_log RPC is not available.");
  }
}

async function executeBulkImport(adminClient: SupabaseAdminClient, rows: BulkUserRow[]) {
  const existingAuthUsers = await listAuthUsersByEmail(adminClient);
  const authUserIdsByEmail = new Map<string, string>();
  const result = {
    createdAuthUsers: 0,
    createdWorkerStatuses: 0,
    reusedAuthUsers: 0,
    reusedWorkerStatuses: 0,
    upsertedAppUsers: 0,
    upsertedWorkerProfiles: 0,
  };

  for (const row of rows) {
    const existingUser = existingAuthUsers.get(row.email);
    const authUserId = existingUser?.id ?? (await createAuthUser(adminClient, row));

    if (existingUser) {
      result.reusedAuthUsers += 1;
    } else {
      result.createdAuthUsers += 1;
      existingAuthUsers.set(row.email, { id: authUserId });
    }

    authUserIdsByEmail.set(row.email, authUserId);
    await upsertAppUser(adminClient, row, authUserId);
    result.upsertedAppUsers += 1;
  }

  for (const row of rows.filter((candidate) => candidate.gid !== "")) {
    const authUserId = authUserIdsByEmail.get(row.email);

    if (!authUserId) {
      throw new Error(`Execution failed: missing auth user for ${row.email}.`);
    }

    await upsertWorkerProfile(adminClient, row, authUserId);
    result.upsertedWorkerProfiles += 1;

    const createdStatus = await insertMissingWorkerStatus(adminClient, authUserId);

    if (createdStatus) {
      result.createdWorkerStatuses += 1;
    } else {
      result.reusedWorkerStatuses += 1;
    }
  }

  return result;
}

async function listAuthUsersByEmail(adminClient: SupabaseAdminClient) {
  const users = new Map<string, { id: string }>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error("Execution failed: could not list existing auth users.");
    }

    for (const user of data.users) {
      if (user.email) {
        users.set(user.email.toLowerCase(), { id: user.id });
      }
    }

    if (data.users.length < perPage) {
      return users;
    }

    page += 1;
  }
}

async function createAuthUser(adminClient: SupabaseAdminClient, row: BulkUserRow) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: row.email,
    email_confirm: true,
    password: row.password,
    user_metadata: {
      avatar_initials: row.avatar_initials,
      name: row.name,
    },
  });

  if (error || !data.user) {
    throw new Error(`Execution failed: could not create auth user for ${row.email}.`);
  }

  return data.user.id;
}

async function upsertAppUser(
  adminClient: SupabaseAdminClient,
  row: BulkUserRow,
  authUserId: string,
) {
  const { data: existingByEmail, error: readError } = await adminClient
    .from("users")
    .select("id")
    .eq("email", row.email)
    .maybeSingle();

  if (readError) {
    throw new Error(`Execution failed: could not inspect app user for ${row.email}.`);
  }

  if (existingByEmail && existingByEmail.id !== authUserId) {
    throw new Error(`Execution blocked: app user email ${row.email} belongs to a different auth id.`);
  }

  const { error } = await adminClient.from("users").upsert(
    {
      email: row.email,
      id: authUserId,
      is_deleted: row.is_deleted === "true",
      name: row.name,
      tier: row.tier,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(`Execution failed: could not upsert app user for ${row.email}.`);
  }
}

async function upsertWorkerProfile(
  adminClient: SupabaseAdminClient,
  row: BulkUserRow,
  authUserId: string,
) {
  const { data: existingGidOwner, error: gidReadError } = await adminClient
    .from("worker_profiles")
    .select("user_id")
    .eq("gid", row.gid)
    .maybeSingle();

  if (gidReadError) {
    throw new Error(`Execution failed: could not inspect worker GID ${row.gid}.`);
  }

  if (existingGidOwner && existingGidOwner.user_id !== authUserId) {
    throw new Error(`Execution blocked: worker GID ${row.gid} belongs to a different user.`);
  }

  const profile = buildWorkerProfileRow(row, authUserId);
  const { error } = await adminClient.from("worker_profiles").upsert(profile, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(`Execution failed: could not upsert worker profile for ${row.email}.`);
  }
}

async function insertMissingWorkerStatus(adminClient: SupabaseAdminClient, authUserId: string) {
  const { data: existingStatus, error: readError } = await adminClient
    .from("worker_status")
    .select("user_id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (readError) {
    throw new Error("Execution failed: could not inspect worker status.");
  }

  if (existingStatus) {
    return false;
  }

  const { error } = await adminClient.from("worker_status").insert({
    current_status: "off",
    user_id: authUserId,
  });

  if (error) {
    throw new Error("Execution failed: could not insert initial worker status.");
  }

  return true;
}

function buildWorkerProfileRow(row: BulkUserRow, authUserId: string) {
  const startTime = row.shift_start === "" ? null : parseShiftTime(row.shift_start);
  const endTime = row.shift_end === "" ? null : parseShiftTime(row.shift_end);
  const profile = {
    cuti_stock: parsePositiveInteger(row.cuti_stock, "cuti_stock"),
    employee_role: row.employee_role,
    gid: row.gid,
    is_flexible: row.is_flexible === "true",
    shift: row.shift,
    shift_end_hour: endTime?.hour ?? null,
    shift_end_min: endTime?.minute ?? null,
    shift_start_hour: startTime?.hour ?? null,
    shift_start_min: startTime?.minute ?? null,
    show_card: row.show_card === "true",
    user_id: authUserId,
  };
  const validation = validateWorkerProfileInput({
    employeeRole: profile.employee_role,
    gid: profile.gid,
    isFlexible: profile.is_flexible,
    shift: profile.shift,
    shiftEndHour: profile.shift_end_hour,
    shiftEndMinute: profile.shift_end_min,
    shiftStartHour: profile.shift_start_hour,
    shiftStartMinute: profile.shift_start_min,
  });

  if (!validation.ok) {
    throw new Error(`Execution blocked: invalid worker profile ${row.email}: ${validation.issues.join("; ")}`);
  }

  return profile;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Execution blocked: ${label} must be a non-negative integer.`);
  }

  return parsed;
}
