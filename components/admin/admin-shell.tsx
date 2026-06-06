"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import type { AdminNavIconKey } from "@/components/admin/admin-icons";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";
import type { StaffTier } from "@/lib/auth/tiers";

export type AdminShellNavItem = {
  href: string;
  icon: AdminNavIconKey;
  label: string;
};

type AdminShellStaff = {
  name: string;
  email: string;
  tier: StaffTier;
};

type AdminShellProps = {
  children: React.ReactNode;
  dateText: string;
  navItems: AdminShellNavItem[];
  staff: AdminShellStaff;
};

export function AdminShell({
  children,
  dateText,
  navItems,
  staff,
}: AdminShellProps) {
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [tabletSidebarExpanded, setTabletSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const activeItem =
    navItems.find((item) => pathname === item.href) ?? navItems[0];
  const activeTitle =
    pathname === "/admin/profile" ? "Profile" : (activeItem?.label ?? "Admin");
  const activeIcon: AdminNavIconKey =
    pathname === "/admin/profile" ? "profile" : (activeItem?.icon ?? "dashboard");
  const isTrackerRoute =
    pathname === "/admin/tracker" || pathname.startsWith("/admin/tracker/");
  const contentWidthClass = "mx-auto w-full max-w-[112rem]";
  const adminContentRhythmClass = "gap-4 py-4";
  const contentOffset = cn(
    "relative z-10 flex min-h-svh flex-col px-4 py-4 md:max-lg:pl-[6.75rem] md:max-lg:pr-5 lg:pr-6",
    desktopSidebarCollapsed ? "lg:pl-[7.5rem]" : "lg:pl-[19rem]",
    tabletSidebarExpanded && "md:max-lg:pl-[18rem]",
  );

  return (
    <div
      className="relative min-h-svh overflow-x-clip bg-background text-foreground"
      data-admin-route={isTrackerRoute ? "tracker" : undefined}
      data-sidebar-state={desktopSidebarCollapsed ? "collapsed" : "expanded"}
    >
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to Admin Content
      </a>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-40 -top-32 size-[34rem] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-44 right-0 size-[34rem] rounded-full bg-secondary/30 blur-3xl"
      />

      <AdminSidebar
        collapsed={desktopSidebarCollapsed}
        navItems={navItems}
        onToggleCollapse={() =>
          setDesktopSidebarCollapsed((isCollapsed) => !isCollapsed)
        }
        pathname={pathname}
        staff={staff}
        variant="desktop"
      />

      <AdminSidebar
        collapsed={!tabletSidebarExpanded}
        navItems={navItems}
        onToggleCollapse={() =>
          setTabletSidebarExpanded((isExpanded) => !isExpanded)
        }
        pathname={pathname}
        staff={staff}
        variant="tablet"
      />

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close Admin Navigation"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <AdminSidebar
            collapsed={false}
            navItems={navItems}
            onClose={() => setMobileSidebarOpen(false)}
            onNavigate={() => setMobileSidebarOpen(false)}
            onToggleCollapse={() => setMobileSidebarOpen(false)}
            pathname={pathname}
            staff={staff}
            variant="mobile"
          />
        </div>
      ) : null}

      <div className={contentOffset}>
        <AdminTopbar
          dateText={dateText}
          iconKey={activeIcon}
          onOpenNavigation={() => {
            setMobileSidebarOpen(true);
            setTabletSidebarExpanded(true);
          }}
          title={activeTitle}
        />
        <main
          id="admin-main"
          className={cn(
            contentWidthClass,
            "flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            adminContentRhythmClass,
          )}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
