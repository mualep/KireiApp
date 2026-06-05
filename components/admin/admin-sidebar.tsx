"use client";

import Link from "next/link";
import {
  ActivityIcon,
  CalendarCheckIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NewspaperIcon,
  XIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import type { AdminShellNavItem } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { StaffTier } from "@/lib/auth/tiers";

type AdminSidebarProps = {
  collapsed: boolean;
  navItems: AdminShellNavItem[];
  onClose?: () => void;
  onNavigate?: () => void;
  onToggleCollapse: () => void;
  pathname: string;
  staff: {
    name: string;
    email: string;
    tier: StaffTier;
  };
  variant: "desktop" | "mobile" | "tablet";
};

export function AdminSidebar({
  collapsed,
  navItems,
  onClose,
  onNavigate,
  onToggleCollapse,
  pathname,
  staff,
  variant,
}: AdminSidebarProps) {
  const initials = getInitials(staff.name, staff.email);
  const isMobile = variant === "mobile";

  return (
    <aside
      className={cn(
        "fixed inset-y-4 left-4 z-30",
        variant === "desktop" && "hidden lg:block",
        variant === "tablet" && "hidden md:max-lg:block",
        isMobile && "z-50 w-[min(18rem,calc(100vw-2rem))] md:hidden",
        !isMobile && (collapsed ? "w-20" : "w-64"),
      )}
      data-admin-sidebar={variant}
      data-collapsed={collapsed}
    >
      <Card
        className={cn(
          "flex h-full min-h-0 flex-col gap-5 rounded-[2rem] border-border/80 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur-xl",
          collapsed && "items-center px-3",
        )}
      >
        <div className="flex items-center justify-between px-1">
          <Link
            href="/admin"
            className={cn(
              "inline-flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              collapsed && "justify-center",
            )}
            aria-label="Kireiku Admin Home"
            onClick={onNavigate}
          >
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-lg font-black italic tracking-tighter text-primary shadow-lg shadow-primary/15"
              translate="no"
            >
              [K]
            </span>
            <span className={cn("min-w-0", collapsed ? "sr-only" : "block")}>
              <span
                className="block truncate text-sm font-bold"
                translate="no"
              >
                Kireiku
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Admin Shell
              </span>
            </span>
          </Link>
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close Admin Navigation"
              onClick={onClose}
            >
              <XIcon data-icon="icon" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? "Expand Admin Navigation" : "Collapse Admin Navigation"}
              title={collapsed ? "Expand Admin Navigation" : "Collapse Admin Navigation"}
              onClick={onToggleCollapse}
            >
              {collapsed ? (
                <PanelLeftOpenIcon data-icon="icon" aria-hidden="true" />
              ) : (
                <PanelLeftCloseIcon data-icon="icon" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>

        <Separator />

        <nav
          aria-label="Admin navigation"
          className={cn("flex flex-col gap-3", collapsed && "items-center")}
        >
          <p
            className={cn(
              "px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground",
              collapsed && "sr-only",
            )}
          >
            Menu
          </p>
          <div className="flex w-full flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = adminNavIcons[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "group inline-flex min-w-0 items-center gap-3 rounded-2xl border py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    collapsed ? "justify-center px-2" : "px-4",
                    isActive
                      ? "border-primary/35 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" />
                  <span className={collapsed ? "sr-only" : "truncate"}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <Separator />
          <Link
            href="/admin/profile"
            aria-label="View Staff Profile"
            title="View Staff Profile"
            onClick={onNavigate}
            className={cn(
              "rounded-2xl border border-border bg-background/45 p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              collapsed && "p-2",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-3",
                collapsed && "justify-center",
              )}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary"
                translate="no"
              >
                {initials}
              </span>
              <span className={cn("min-w-0", collapsed && "sr-only")}>
                <span
                  className="block truncate text-sm font-bold"
                  translate="no"
                >
                  {staff.name}
                </span>
                <span className="block truncate text-[0.65rem] font-semibold uppercase tracking-widest text-primary">
                  {staff.tier}
                </span>
              </span>
            </div>
          </Link>
          <LogoutButton>
            <Button
              type="submit"
              variant="ghost"
              className={cn(
                "w-full rounded-2xl text-muted-foreground hover:text-primary",
                collapsed && "px-0",
              )}
            >
              <LogOutIcon data-icon="inline-start" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : undefined}>Logout</span>
            </Button>
          </LogoutButton>
        </div>
      </Card>
    </aside>
  );
}

const adminNavIcons: Record<AdminShellNavItem["icon"], LucideIcon> = {
  absensi: CalendarCheckIcon,
  content: NewspaperIcon,
  dashboard: LayoutDashboardIcon,
  profile: UserRoundIcon,
  tracker: ActivityIcon,
};

function getInitials(name: string, email: string): string {
  const fallback = email.slice(0, 2);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || fallback).toUpperCase();
}
