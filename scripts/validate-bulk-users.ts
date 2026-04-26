import {
  hasValidationIssues,
  loadAndValidateBulkUsers,
  printRedactedValidationSummary,
} from "./bulk-users/shared";

const loaded = loadAndValidateBulkUsers();

if (!loaded.ok) {
  console.error(loaded.message);
  process.exit(1);
}

printRedactedValidationSummary(loaded.result);

if (hasValidationIssues(loaded.result)) {
  process.exit(1);
}
