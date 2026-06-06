import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const packageJsonPath = resolve(projectRoot, "package.json");
const layoutPath = resolve(projectRoot, "app/admin/(shell)/layout.tsx");
const adminIconsPath = resolve(projectRoot, "components/admin/admin-icons.tsx");
const shellPath = resolve(projectRoot, "components/admin/admin-shell.tsx");
const sidebarPath = resolve(projectRoot, "components/admin/admin-sidebar.tsx");
const topbarPath = resolve(projectRoot, "components/admin/admin-topbar.tsx");
const topbarLiveStatusPath = resolve(
  projectRoot,
  "components/admin/admin-topbar-live-status.tsx",
);
const logoutButtonPath = resolve(projectRoot, "components/admin/logout-button.tsx");
const appDir = resolve(projectRoot, "app");

for (const path of [
  packageJsonPath,
  layoutPath,
  adminIconsPath,
  shellPath,
  sidebarPath,
  topbarPath,
  topbarLiveStatusPath,
  logoutButtonPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for admin shell navigation.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const adminIconsSource = readFileSync(adminIconsPath, "utf8");
const shellSource = readFileSync(shellPath, "utf8");
const sidebarSource = readFileSync(sidebarPath, "utf8");
const topbarSource = readFileSync(topbarPath, "utf8");
const topbarLiveStatusSource = readFileSync(topbarLiveStatusPath, "utf8");
const logoutButtonSource = readFileSync(logoutButtonPath, "utf8");
const shellUiSource = [
  adminIconsSource,
  shellSource,
  sidebarSource,
  topbarSource,
  topbarLiveStatusSource,
  logoutButtonSource,
].join("\n");
const adminShellSources = [
  layoutSource,
  adminIconsSource,
  shellSource,
  sidebarSource,
  topbarSource,
  topbarLiveStatusSource,
  logoutButtonSource,
].join("\n");

assertIncludes(packageJsonSource, '"test:admin-shell-navigation"');

assert.match(shellSource, /^"use client";/);
assert.match(sidebarSource, /^"use client";/);
assert.match(topbarSource, /^"use client";/);
assert.match(topbarLiveStatusSource, /^"use client";/);
assert.match(logoutButtonSource, /^"use client";/);

assertIncludes(adminIconsSource, "export type AdminNavIconKey");
assertIncludes(adminIconsSource, "export function AdminNavIcon");
assertIncludes(adminIconsSource, "MousePointerClickIcon");
assertIncludes(adminIconsSource, "SidebarOpenIcon");
assertIncludes(adminIconsSource, "SidebarCloseIcon");
assertIncludes(adminIconsSource, 'tracker: MousePointerClickIcon');
assertIncludes(adminIconsSource, 'dashboard: LayoutDashboardIcon');
assertIncludes(adminIconsSource, 'absensi: CalendarCheckIcon');
assertIncludes(adminIconsSource, 'content: NewspaperIcon');
assertIncludes(adminIconsSource, 'profile: UserRoundIcon');

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
assertIncludes(sidebarSource, "AdminNavIcon");
assertIncludes(sidebarSource, "SidebarOpenIcon");
assertIncludes(sidebarSource, "SidebarCloseIcon");
assertIncludes(sidebarSource, "group/brand");
assertIncludes(sidebarSource, "group-hover/brand:opacity-0");
assertIncludes(sidebarSource, "group-hover/brand:opacity-100");
assertIncludes(sidebarSource, "group-focus-within/brand:opacity-100");
assertNoPattern(
  sidebarSource,
  /rounded-\[2rem\]|rounded-2xl/,
  "Admin sidebar chrome/nav should avoid over-rounded pill-like shapes.",
);
assertNoPattern(
  sidebarSource,
  /PanelLeftOpenIcon|PanelLeftCloseIcon|ActivityIcon/,
  "Sidebar should use shared admin icons and sidebar-open/sidebar-close affordances.",
);

assertIncludes(shellSource, "useState");
assertIncludes(shellSource, "desktopSidebarCollapsed");
assertIncludes(shellSource, "tabletSidebarExpanded");
assertIncludes(shellSource, "mobileSidebarOpen");
assertIncludes(shellSource, 'data-sidebar-state={desktopSidebarCollapsed ? "collapsed" : "expanded"}');
assertIncludes(shellSource, "activeIcon");
assertIncludes(shellSource, "contentWidthClass");
assertIncludes(shellSource, "max-w-[112rem]");
assertIncludes(shellSource, 'const adminContentRhythmClass = "gap-4 py-4";');
assertIncludes(shellSource, "adminContentRhythmClass");
assertNoPattern(
  shellSource,
  /adminContentRhythmClass\s*=.*(?:gap-2\.5|gap-3|gap-5|gap-6|py-6)/,
  "Dashboard reference rhythm must remain the shared gap-4 py-4 shell contract.",
);
assertNoPattern(
  shellSource,
  /isTrackerRoute\s*\?\s*["']gap-3 py-4["']\s*:\s*["']gap-6 py-6["']/,
  "Admin shell should use one shared topbar-to-content rhythm across admin pages.",
);
assertNoPattern(
  shellSource,
  /isTrackerRoute\s*\?\s*["'][^"']*max-w-\[112rem\][^"']*["']\s*:\s*["'][^"']*max-w-6xl/,
  "Shared admin shell should not use narrower non-Tracker content width.",
);
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
assertIncludes(topbarSource, "AdminTopbarLiveStatus");
assertIncludes(topbarSource, "AdminTopbarClock");
assertIncludes(topbarSource, "initialText={dateText}");
assertIncludes(topbarSource, "sticky top-4 z-30");
assertNoPattern(
  topbarSource,
  />\s*Signal\s*</,
  'Admin topbar must not render the literal word "Signal".',
);
assertIncludes(topbarSource, "AdminNavIcon");
assertIncludes(topbarSource, "iconKey");
assertNoPattern(
  topbarSource,
  /hidden\s+size-7\s+shrink-0\s+items-center\s+justify-center\s+rounded-lg\s+border\s+border-primary\/20\s+bg-primary\/10/,
  "Admin topbar page icon should be standalone, not inside a rounded rectangle box.",
);
assertNoPattern(
  topbarSource,
  /<span[^>]*rounded-lg[^>]*>[\s\S]*<AdminNavIcon iconKey=\{iconKey\}/,
  "Admin topbar page icon wrapper must not use rounded box styling.",
);
assertIncludes(topbarSource, "onOpenNavigation");
assertIncludes(topbarSource, 'aria-label="Open Admin Navigation"');
assertIncludes(topbarSource, "md:hidden");
assertNoPattern(
  topbarSource,
  /lg:hidden/,
  "Admin topbar hamburger should be mobile-only, not tablet-visible.",
);
assertNoPattern(
  topbarSource,
  /AdminLiveSignal|RadioTowerIcon|ShieldCheckIcon|LIVE|max-w-6xl/,
  "Admin topbar should use shared page icons, live status, and full width.",
);

assertIncludes(topbarLiveStatusSource, "AdminTopbarLiveStatus");
assertIncludes(topbarLiveStatusSource, "AdminTopbarClock");
assertIncludes(topbarLiveStatusSource, 'const LIVE_STATUS_PROBE_PATH = "/brand/kireiapp-mark.svg";');
assertIncludes(topbarLiveStatusSource, "fetch(LIVE_STATUS_PROBE_PATH");
assertIncludes(topbarLiveStatusSource, 'cache: "no-store"');
assertIncludes(topbarLiveStatusSource, "performance.now()");
assertIncludes(topbarLiveStatusSource, "AbortController");
assertIncludes(topbarLiveStatusSource, "window.setInterval");
assertIncludes(topbarLiveStatusSource, "window.clearInterval");
assertIncludes(topbarLiveStatusSource, "controller.abort()");
assertIncludes(topbarLiveStatusSource, "Offline");
assertIncludes(topbarLiveStatusSource, "-- ms");
assertIncludes(topbarLiveStatusSource, "Intl.DateTimeFormat");
assertIncludes(topbarLiveStatusSource, 'second: "2-digit"');
assertNoPattern(
  topbarLiveStatusSource,
  /https?:\/\//,
  "Admin topbar live status must not use external network URLs.",
);
assertNoPattern(
  topbarLiveStatusSource,
  /\/api\//,
  "Admin topbar live status must not use app API routes.",
);
assertNoPattern(
  topbarLiveStatusSource,
  /@\/lib\/supabase|createClient|\.rpc\s*\(|\.from\(|channel|subscribe|realtime|postgres_changes/i,
  "Admin topbar live status must not use Supabase or realtime sync.",
);

assertIncludes(sidebarSource, "onToggleCollapse");
assertIncludes(sidebarSource, "onClose");
assertIncludes(sidebarSource, "onNavigate");
assertIncludes(sidebarSource, 'aria-label="Expand Admin Navigation"');
assertIncludes(sidebarSource, 'size="icon-lg"');
assertNoPattern(
  sidebarSource,
  /\[&_svg\]:size-6/,
  "Sidebar utility icons should inherit the same visual icon size as nav icons.",
);
assertIncludes(sidebarSource, 'aria-label="Collapse Admin Navigation"');
assertIncludes(sidebarSource, "title={item.label}");
assertIncludes(sidebarSource, "aria-label={item.label}");
assertIncludes(sidebarSource, "<Link");
assertNoPattern(
  sidebarSource,
  /router\.push|window\.location|onClick=\{\(\)\s*=>\s*(?:router|window)/,
  "Admin sidebar navigation must remain real links.",
);

assertIncludes(logoutButtonSource, "Dialog");
assertIncludes(logoutButtonSource, "DialogTrigger");
assertIncludes(logoutButtonSource, "DialogContent");
assertIncludes(logoutButtonSource, "DialogTitle");
assertIncludes(logoutButtonSource, "DialogDescription");
assertIncludes(logoutButtonSource, "DialogClose");
assertIncludes(logoutButtonSource, "signOutStaff");
assertIncludes(logoutButtonSource, "Are You Sure You Want To Log Out?");
assertIncludes(logoutButtonSource, "Cancel");
assertIncludes(logoutButtonSource, "Log Out");
assertIncludes(logoutButtonSource, 'type="submit"');
assertIncludes(logoutButtonSource, "asChild");

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
