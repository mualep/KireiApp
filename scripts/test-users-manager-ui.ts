import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app/admin/(shell)/users/page.tsx");
const tablePath = resolve(process.cwd(), "components/admin/users/users-table.tsx");
const createDialogPath = resolve(process.cwd(), "components/admin/users/create-worker-dialog.tsx");
const editDialogPath = resolve(process.cwd(), "components/admin/users/edit-worker-dialog.tsx");
const manageSpDialogPath = resolve(process.cwd(), "components/admin/users/manage-sp-dialog.tsx");
const deactivationDialogPath = resolve(process.cwd(), "components/admin/users/deactivation-dialog.tsx");

for (const p of [pagePath, tablePath, createDialogPath, editDialogPath, manageSpDialogPath, deactivationDialogPath]) {
  if (!existsSync(p)) {
    console.error(`RED: Missing file ${p}`);
    process.exit(1);
  }
}

const pageContent = readFileSync(pagePath, "utf8");
const tableContent = readFileSync(tablePath, "utf8");
const createDialogContent = readFileSync(createDialogPath, "utf8");

// ============================================================================
// Page Assertions
// ============================================================================
assert.ok(
  pageContent.includes("getUsersManagerList"),
  "page.tsx must call getUsersManagerList",
);
assert.ok(
  pageContent.includes("redirect") || pageContent.includes("forbidden") || pageContent.includes("not-found"),
  "page.tsx must protect against member access",
);
assert.ok(
  pageContent.includes("UsersTable"),
  "page.tsx must render UsersTable",
);

// ============================================================================
// Table Assertions
// ============================================================================
assert.ok(
  tableContent.includes('"use client"') || tableContent.includes("'use client'"),
  "users-table.tsx must use client",
);
assert.ok(
  tableContent.includes("CreateWorkerDialog") || pageContent.includes("CreateWorkerDialog"),
  "table/page must include CreateWorkerDialog",
);
assert.ok(
  tableContent.includes("EditWorkerDialog"),
  "table must include EditWorkerDialog",
);
assert.ok(
  tableContent.includes("ManageSpDialog"),
  "table must include ManageSpDialog",
);
assert.ok(
  tableContent.includes("DeactivationDialog"),
  "table must include DeactivationDialog",
);
assert.ok(
  tableContent.includes("owner") && tableContent.includes("admin") && (tableContent.includes("deactivate") || tableContent.includes("Deactivate")),
  "table must handle owner vs admin prop for deactivation visibility",
);

// ============================================================================
// Create Worker Dialog Assertions
// ============================================================================
assert.ok(
  createDialogContent.includes("tier: \"member\"") || createDialogContent.includes("tier: 'member'"),
  "create-worker-dialog.tsx must default tier to member strictly",
);

console.log("Users Manager UI static tests passed.");
