"use client";

import { usePathname } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";
import type { StaffTier } from "@/lib/auth/tiers";

export type AdminShellNavItem = {
  href: string;
  icon: "content" | "dashboard" | "profile" | "tracker";
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
  const pathname = usePathname();
  const activeItem =
    navItems.find((item) => pathname === item.href) ?? navItems[0];
  const isTrackerRoute =
    pathname === "/admin/tracker" || pathname.startsWith("/admin/tracker/");

  return (
    <div
      className="relative min-h-svh overflow-x-hidden bg-background text-foreground"
      data-admin-route={isTrackerRoute ? "tracker" : undefined}
      data-sidebar-state="expanded"
    >
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to Admin Content
      </a>

      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-35"
      />
      <div
        aria-hidden="true"
        className="fixed -left-40 -top-32 size-[34rem] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-44 right-0 size-[34rem] rounded-full bg-secondary/30 blur-3xl"
      />

      <AdminSidebar
        navItems={navItems}
        pathname={pathname}
        staff={staff}
      />

      <div className="relative flex min-h-svh flex-col px-4 py-4 lg:pl-[19rem] lg:pr-6">
        <AdminTopbar
          dateText={dateText}
          title={activeItem?.label ?? "Admin"}
        />
        <main
          id="admin-main"
          className={cn(
            "mx-auto flex w-full flex-1 flex-col outline-none",
            isTrackerRoute ? "max-w-[112rem] gap-3 py-4" : "max-w-6xl gap-6 py-6",
          )}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
