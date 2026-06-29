import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const contractPath = resolve(
  projectRoot,
  "docs/plans/release-3h-sp-manager-contract.md",
);

assert.ok(existsSync(contractPath), "R3-H SP Manager contract must exist.");

const contractSource = readFileSync(contractPath, "utf8");

// Active SP derivation clause
assertIncludes(
  contractSource,
  "expires_at > NOW()",
  "Contract must define active SP as: expires_at > NOW().",
);

// Revocation fields
assertIncludes(
  contractSource,
  "revoked_at",
  "Contract must define revoked_at for revocation.",
);
assertIncludes(
  contractSource,
  "revoked_by",
  "Contract must define revoked_by for revocation.",
);

// SP levels
assertIncludes(contractSource, "sp_level");

// Revocation irreversibility
assertIncludes(
  contractSource,
  "irreversible",
  "Contract must state that revocation is irreversible.",
);

// Error codes
assertIncludes(contractSource, "sp.unauthorized");
assertIncludes(contractSource, "sp.already_revoked");

// Audit requirement
assertIncludes(contractSource, "audit_logs");

// Hard delete out of scope
assertIncludes(
  contractSource,
  "Hard deletion",
  "Contract must explicitly address hard deletion boundary.",
);

console.log("SP Manager contract tests passed.");

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
