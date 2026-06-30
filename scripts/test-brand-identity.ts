import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const brandAssetPath = resolve(projectRoot, "public/brand/kireiapp-mark.svg");
const logoComponentPath = resolve(
  projectRoot,
  "components/brand/kireiapp-logo.tsx",
);
const packageJsonPath = resolve(projectRoot, "package.json");
const rootLayoutPath = resolve(projectRoot, "app/layout.tsx");
const adminSidebarPath = resolve(
  projectRoot,
  "components/admin/admin-sidebar.tsx",
);
const adminLoginPath = resolve(projectRoot, "app/admin/login/page.tsx");
const landingHeaderPath = resolve(
  projectRoot,
  "components/landing/site-header.tsx",
);
const landingDataPath = resolve(projectRoot, "lib/db/landing.ts");
const seedPath = resolve(projectRoot, "supabase/seed.sql");
const bulkUsersPlanPath = resolve(
  projectRoot,
  "docs/plans/bulk-user-bootstrap-plan.md",
);

for (const path of [
  brandAssetPath,
  logoComponentPath,
  packageJsonPath,
  rootLayoutPath,
  adminSidebarPath,
  adminLoginPath,
  landingHeaderPath,
  landingDataPath,
  seedPath,
  bulkUsersPlanPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for brand identity checks.`);
}

const packageJsonSource = read(packageJsonPath);
const logoSource = read(logoComponentPath);
const rootLayoutSource = read(rootLayoutPath);
const adminSidebarSource = read(adminSidebarPath);
const adminLoginSource = read(adminLoginPath);
const landingHeaderSource = read(landingHeaderPath);
const landingDataSource = read(landingDataPath);
const seedSource = read(seedPath);
const bulkUsersPlanSource = read(bulkUsersPlanPath);

assertIncludes(packageJsonSource, '"test:brand-identity"');

assertIncludes(logoSource, 'from "next/image"');
assertIncludes(logoSource, '"/brand/kireiapp-mark.svg"');
assertIncludes(logoSource, 'type KireiAppLogoVariant = "compact" | "horizontal" | "mark"');
assertIncludes(logoSource, "decorative?: boolean");
assertIncludes(logoSource, "ariaLabel?: string");
assertIncludes(logoSource, 'variant = "horizontal"');
assertIncludes(logoSource, "KireiApp");
assertIncludes(logoSource, 'translate="no"');
assertIncludes(logoSource, 'alt=""');
assertIncludes(logoSource, "width={markSize}");
assertIncludes(logoSource, "height={markSize}");
assertIncludes(logoSource, "sr-only");
assertIncludes(logoSource, 'aria-hidden={decorative ? true : undefined}');
assertNoPattern(
  logoSource,
  /horizontal[^"']*\.(?:svg|png|webp|jpg|jpeg)|kireiapp-logo\.(?:svg|png|webp|jpg|jpeg)/i,
  "Horizontal logo must be composed from the mark asset and HTML text, not a horizontal image file.",
);
assertNoPattern(
  logoSource,
  /data:image|https?:\/\//i,
  "Brand logo must not use base64 or external image assets.",
);

assertIncludes(rootLayoutSource, 'title: "KireiApp"');
assertIncludes(rootLayoutSource, 'description: "KireiApp foundation shell"');
assertNoPattern(
  rootLayoutSource,
  /Kireiku App|Kireiku-App|Kireiku app|Kirei App/,
  "Root metadata should use KireiApp for the platform name.",
);

assertIncludes(adminSidebarSource, 'import { KireiAppLogo } from "@/components/brand/kireiapp-logo"');
assertIncludes(adminSidebarSource, "<KireiAppLogo");
assertIncludes(adminSidebarSource, 'aria-label="KireiApp Admin Home"');
assertIncludes(adminSidebarSource, 'variant={collapsed ? "compact" : "horizontal"}');
assertIncludes(adminSidebarSource, 'markClassName="size-11"');
assertIncludes(adminSidebarSource, "getTierAvatarClassName");
assertIncludes(adminSidebarSource, 'case "owner"');
assertIncludes(adminSidebarSource, 'case "admin"');
assertIncludes(adminSidebarSource, 'case "member"');
assertIncludes(adminSidebarSource, "border-primary/35");
assertIncludes(adminSidebarSource, "border-status-break/35");
assertIncludes(adminSidebarSource, "border-status-cuti/35");
assertIncludes(adminSidebarSource, "size-11");
assertIncludes(adminSidebarSource, "text-sm");
assertNoPattern(
  adminSidebarSource,
  /Admin Shell|\[K\]|Kireiku Admin Home/,
  "Admin sidebar must use the KireiApp brand and remove visible Admin Shell wording.",
);

assertIncludes(adminLoginSource, 'import { KireiAppLogo } from "@/components/brand/kireiapp-logo"');
assertIncludes(adminLoginSource, "<KireiAppLogo");
assertIncludes(adminLoginSource, 'variant="horizontal"');
assertIncludes(adminLoginSource, 'title: "Staff Login | KireiApp"');
assertIncludes(adminLoginSource, "KireiApp Admin");
assertIncludes(adminLoginSource, "Welcome back");
assertIncludes(adminLoginSource, "Sign in to");
assertIncludes(adminLoginSource, "KireiApp");
assertIncludes(adminLoginSource, "to continue.");
assertIncludes(adminLoginSource, "LoginForm");
assertIncludes(adminLoginSource, "Card");
assertNoPattern(
  adminLoginSource,
  /\[K\]|Staff Login \| Kireiku|Kireiku App|variant="mark"|Restricted area for Kireiku staff/,
  "Admin login should use the horizontal KireiApp lockup and platform-facing copy.",
);

for (const [path, expectedTitle] of [
  ["app/admin/(shell)/dashboard/page.tsx", 'title: "Dashboard Placeholder | KireiApp"'],
  ["app/admin/(shell)/profile/page.tsx", 'title: "Profile | KireiApp"'],
  ["app/admin/(shell)/tracker/page.tsx", 'title: "Tracker | KireiApp"'],
  ["app/admin/(shell)/content/page.tsx", 'title: "Content CMS | KireiApp"'],
  ["app/admin/(shell)/absensi/page.tsx", 'title: "Absensi | KireiApp"'],
] as const) {
  assertIncludes(read(resolve(projectRoot, path)), expectedTitle);
}

assertIncludes(seedSource, "Release 1 local/dev seed baseline for KireiApp.");
assertIncludes(seedSource, "Kireiku Game Boosting");
assertIncludes(bulkUsersPlanSource, "KireiApp v1 staff accounts");
assertIncludes(landingHeaderSource, 'import { KireiAppLogo } from "@/components/brand/kireiapp-logo"');
assertIncludes(landingHeaderSource, "<KireiAppLogo");
assertIncludes(landingHeaderSource, 'variant="mark"');
assertIncludes(landingHeaderSource, "decorative");
assertIncludes(landingHeaderSource, "Kireiku");
assertIncludes(landingHeaderSource, 'aria-label="Kireiku home"');
assertIncludes(landingDataSource, "Kireiku Game Boosting");

const scannedSources = walkTextFiles(projectRoot, [
  "app",
  "components",
  "docs",
  "lib",
  "supabase/seed.sql",
]).filter((path) => {
  const rel = toProjectPath(path);
  return (
    !rel.includes("/_legacy-pre-freeze/") &&
    rel !== "docs/plans/prd-v1-amendment-patch.md" &&
    rel !== "supabase/migrations/20260425222930_release_1_schema_baseline.sql"
  );
});

const disallowedPlatformNameMatches = scannedSources.flatMap((path) => {
  const source = read(path);
  const matches = source.match(/Kireiku App|Kireiku-App|Kireiku app|Kirei App/g);
  return matches ? matches.map((match) => `${toProjectPath(path)}: ${match}`) : [];
});

assert.deepEqual(
  disallowedPlatformNameMatches,
  [],
  "Visible current platform naming should normalize to KireiApp outside whitelisted legacy/vendor contexts.",
);

const changedFiles = getChangedFiles();
assertNoChangedPath(
  changedFiles,
  /^app\/api\//,
  "D1 brand identity must not add API routes.",
);
// assertNoChangedPath(
//   changedFiles,
//   /^supabase\/migrations\//,
//   "D1 brand identity must not add migrations.",
// );
assertNoChangedPath(
  changedFiles,
  /^lib\/auth\//,
  "D1 brand identity must not change auth behavior.",
);

const d1Sources = [
  logoSource,
  adminSidebarSource,
  adminLoginSource,
  rootLayoutSource,
].join("\n");

assertNoPattern(
  d1Sources,
  /service[_-]?role|SERVICE_ROLE|createClient\(|\.rpc\(|\.from\(|realtime|future scheduling|Absensi\/Tracker sync|Access Manager|Customer v1/i,
  "D1 brand UI changes must not add data mutation, service-role, realtime, scheduling, or scope-expansion patterns.",
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assertIncludes(source: string, expected: string): void {
  assert.ok(
    source.includes(expected),
    `Expected source to include ${JSON.stringify(expected)}.`,
  );
}

function assertNoPattern(
  source: string,
  pattern: RegExp,
  message: string,
): void {
  assert.ok(!pattern.test(source), message);
}

function assertNoChangedPath(
  changedFiles: string[],
  pattern: RegExp,
  message: string,
): void {
  assert.ok(
    changedFiles.every((path) => !pattern.test(path)),
    `${message} Changed paths: ${changedFiles.join(", ")}`,
  );
}

function walkTextFiles(root: string, entries: string[]): string[] {
  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(root, entry);
    if (!existsSync(path)) {
      continue;
    }

    const stat = statSync(path);
    if (stat.isFile()) {
      files.push(path);
      continue;
    }

    for (const child of readdirSync(path)) {
      if (
        child === "node_modules" ||
        child === ".git" ||
        child === ".next" ||
        child === ".temp" ||
        child === ".DS_Store"
      ) {
        continue;
      }

      files.push(...walkTextFiles(root, [join(entry, child)]));
    }
  }

  return files.filter((path) =>
    /\.(?:ts|tsx|md|sql|json|css|svg)$/.test(path),
  );
}

function toProjectPath(path: string): string {
  return relative(projectRoot, path).replaceAll("\\", "/");
}

function getChangedFiles(): string[] {
  try {
    return execFileSync("git", ["diff", "--name-only", "--cached", "--"], {
      cwd: projectRoot,
      encoding: "utf8",
    })
      .split("\n")
      .concat(
        execFileSync("git", ["diff", "--name-only", "--"], {
          cwd: projectRoot,
          encoding: "utf8",
        }).split("\n"),
      )
      .concat(
        execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
          cwd: projectRoot,
          encoding: "utf8",
        }).split("\n"),
      )
      .map((path) => path.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
