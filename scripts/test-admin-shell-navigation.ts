import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const packageJsonPath = resolve(projectRoot, "package.json");
const layoutPath = resolve(projectRoot, "app/admin/(shell)/layout.tsx");
const shellPath = resolve(projectRoot, "components/admin/admin-shell.tsx");
const sidebarPath = resolve(projectRoot, "components/admin/admin-sidebar.tsx");
const topbarPath = resolve(projectRoot, "components/admin/admin-topbar.tsx");
const appDir = resolve(projectRoot, "app");

for (const path of [packageJsonPath, layoutPath, shellPath, sidebarPath, topbarPath]) {
  assert.ok(existsSync(path), `${path} must exist for admin shell navigation.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const shellSource = readFileSync(shellPath, "utf8");
const sidebarSource = readFileSync(sidebarPath, "utf8");
const topbarSource = readFileSync(topbarPath, "utf8");
const shellUiSource = [shellSource, sidebarSource, topbarSource].join("\n");
const adminShellSources = [
  layoutSource,
  shellSource,
  sidebarSource,
  topbarSource,
].join("\n");

assertIncludes(packageJsonSource, '"test:admin-shell-navigation"');

assert.match(shellSource, /^"use client";/);
assert.match(sidebarSource, /^"use client";/);
assert.match(topbarSource, /^"use client";/);

const ownerNavSource = getBetween(
  layoutSource,
  "const ownerAdminNavItems",
  "const memberNavItems",
);
const memberNavSource = layoutSource.slice(layoutSource.indexOf("const memberNavItems"));

assertOrderedFragments(ownerNavSource, [
  'label: "Dashboard"',
  'label: "Tracker"',
  'label: "Absensi"',
  'label: "Content"',
]);
assertNoPattern(
  ownerNavSource,
  /label:\s*["']Profile["']|href:\s*["']\/admin\/profile["']/,
  "Owner/Admin main nav must not include Profile.",
);

for (const fragment of [
  'href: "/admin/profile"',
  'label: "Profile"',
  'href: "/admin/tracker"',
  'label: "Tracker"',
  'href: "/admin/absensi"',
  'label: "Absensi"',
]) {
  assertIncludes(memberNavSource, fragment);
}
assertNoPattern(
  memberNavSource,
  /href:\s*["']\/admin\/content["']|label:\s*["']Content["']/,
  "Member nav must not include Content.",
);

assertIncludes(sidebarSource, 'href="/admin/profile"');
assertIncludes(sidebarSource, "Profile");
assertIncludes(sidebarSource, "Logout");
assertIncludes(sidebarSource, "LogoutButton");

assertIncludes(shellSource, "useState");
assertIncludes(shellSource, "desktopSidebarCollapsed");
assertIncludes(shellSource, "tabletSidebarExpanded");
assertIncludes(shellSource, "mobileSidebarOpen");
assertIncludes(shellSource, 'data-sidebar-state={desktopSidebarCollapsed ? "collapsed" : "expanded"}');
assertNoPattern(
  shellSource,
  /localStorage|sessionStorage|supabase/i,
  "Sidebar state must remain local React state and not use storage or Supabase.",
);

assertIncludes(shellSource, 'aria-label="Close Admin Navigation"');
assertIncludes(shellSource, "md:hidden");
assertIncludes(shellSource, "md:max-lg");
assertIncludes(shellSource, "lg:");
assertIncludes(shellSource, "pointer-events-none");
assertIncludes(shellUiSource, "z-30");
assertIncludes(shellUiSource, "z-40");
assertIncludes(shellUiSource, "z-50");
assert.ok(
  [...shellSource.matchAll(/aria-hidden="true"\s+className="([^"]*fixed[^"]*)"/g)].every(
    (match) => match[1].includes("pointer-events-none"),
  ),
  "Fixed decorative layers must not block admin navigation.",
);

assertIncludes(topbarSource, "MenuIcon");
assertIncludes(topbarSource, "onOpenNavigation");
assertIncludes(topbarSource, 'aria-label="Open Admin Navigation"');
assertIncludes(topbarSource, "lg:hidden");

assertIncludes(sidebarSource, "onToggleCollapse");
assertIncludes(sidebarSource, "onClose");
assertIncludes(sidebarSource, "onNavigate");
assertIncludes(sidebarSource, 'aria-label={collapsed ? "Expand Admin Navigation" : "Collapse Admin Navigation"}');
assertIncludes(sidebarSource, "title={item.label}");
assertIncludes(sidebarSource, "aria-label={item.label}");
assertIncludes(sidebarSource, "<Link");
assertNoPattern(
  sidebarSource,
  /router\.push|window\.location|onClick=\{\(\)\s*=>\s*(?:router|window)/,
  "Admin sidebar navigation must remain real links.",
);

assertNoPattern(
  shellUiSource,
  /transition-all/,
  "Admin shell navigation should avoid transition-all.",
);
assertNoPattern(
  shellUiSource,
  /(?<!focus-visible:)outline-none/,
  "Interactive admin shell controls need focus-visible replacement.",
);

const forbiddenClientPattern =
  /@\/lib\/supabase|createClient|\.rpc\s*\(|\.from\(|\.(insert|update|upsert|delete)\s*\(|apply_tracker_|trackerActions|trackerCorrectionActions|worker_status|channel|subscribe|realtime|postgres_changes/i;
assertNoPattern(shellUiSource, forbiddenClientPattern, "Admin shell UI must not add data mutations or realtime sync.");

assert.equal(
  listFiles(appDir).some((filePath) => /\/api\/(?:absensi|tracker|admin)\/route\.(ts|tsx|js|jsx)$/.test(filePath)),
  false,
  "Admin shell navigation must not add API routes.",
);
assertNoPattern(
  adminShellSources,
  /supabase\/migrations|apply_absensi|apply_tracker|future scheduling/i,
  "Admin shell navigation must not add backend contract, RPC, or scheduling behavior.",
);

console.log("Admin shell navigation tests passed.");

function getBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);

  assert.ok(startIndex >= 0, `Missing source start: ${start}`);
  assert.ok(endIndex > startIndex, `Missing source end after start: ${end}`);

  return source.slice(startIndex, endIndex);
}

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function assertOrderedFragments(source: string, fragments: string[]) {
  let cursor = -1;

  for (const fragment of fragments) {
    const index = source.indexOf(fragment);

    assert.notEqual(index, -1, `Missing ordered fragment: ${fragment}`);
    assert.ok(index > cursor, `Expected ${fragment} after previous nav item.`);
    cursor = index;
  }
}

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
