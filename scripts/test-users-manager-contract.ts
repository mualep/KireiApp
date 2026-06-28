import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const contractPath = resolve(
  projectRoot,
  "docs/plans/release-3g-users-manager-contract.md",
);

assert.ok(existsSync(contractPath), "R3-G Users Manager contract must exist.");

const contractSource = readFileSync(contractPath, "utf8");

// Actor boundary
assertIncludes(contractSource, "owner");
assertIncludes(contractSource, "admin");
assertIncludes(contractSource, "member");

// Service-Role only creation flow
assertIncludes(
  contractSource,
  "Service-Role only flow",
  "Contract must specify Service-Role only flow for worker creation.",
);
assertIncludes(
  contractSource,
  "service role key",
  "Contract must warn that the service role key must never appear in client components.",
);

// Soft-delete / archive-first policy
assertIncludes(
  contractSource,
  "is_deleted",
  "Contract must reference is_deleted column for soft-delete.",
);
assertIncludes(
  contractSource,
  "archive/deactivate-first",
  "Contract must state archive-first policy before any deletion.",
);

// Hard delete out of scope
assertIncludes(
  contractSource,
  "Hard deletion",
  "Contract must explicitly address hard deletion boundary.",
);

// Audit requirement
assertIncludes(contractSource, "audit_logs");

console.log("Users Manager contract tests passed.");

function assertIncludes(
  source: string,
  expected: string,
  message?: string,
) {
  assert.ok(
    source.toLowerCase().includes(expected.toLowerCase()),
    message ?? `Expected contract to include: "${expected}"`,
  );
}
