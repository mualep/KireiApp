"use client";

import Link from "next/link";
import { LogOutIcon, XIcon } from "lucide-react";

import {
  AdminNavIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from "@/components/admin/admin-icons";
import { LogoutButton } from "@/components/admin/logout-button";
import { KireiAppLogo } from "@/components/brand/kireiapp-logo";
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
  const tierAvatarClassName = getTierAvatarClassName(staff.tier);
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
          "flex h-full min-h-0 flex-col gap-5 rounded-xl border-border/80 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur-xl",
          collapsed && "items-center px-3",
        )}
      >
        <div className="flex items-center justify-between px-1">
          <div
            className={cn(
              "group/brand relative inline-flex min-w-0 items-center gap-3 rounded-lg",
              collapsed && "justify-center",
            )}
          >
            <Link
              href="/admin"
              className={cn(
                "inline-flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                collapsed &&
                  "justify-center transition-opacity group-hover/brand:opacity-0 group-focus-within/brand:opacity-0",
              )}
              aria-label="KireiApp Admin Home"
              onClick={onNavigate}
            >
              <KireiAppLogo
                variant={collapsed ? "compact" : "horizontal"}
                className={cn(
                  "text-foreground",
                  collapsed ? "size-11" : "min-w-0",
                )}
                markClassName="size-11"
                textClassName="text-sm"
              />
            </Link>
            {collapsed && !isMobile ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label="Expand Admin Navigation"
                title="Expand Admin Navigation"
                className="absolute inset-0 size-11 opacity-0 transition-opacity group-hover/brand:opacity-100 group-focus-within/brand:opacity-100 [&_svg:not([class*='size-'])]:size-5"
                onClick={onToggleCollapse}
              >
                <SidebarOpenIcon data-icon="icon" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close Admin Navigation"
              className="[&_svg:not([class*='size-'])]:size-5"
              onClick={onClose}
            >
              <XIcon data-icon="icon" aria-hidden="true" />
            </Button>
          ) : collapsed ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse Admin Navigation"
              title="Collapse Admin Navigation"
              className="[&_svg:not([class*='size-'])]:size-5"
              onClick={onToggleCollapse}
            >
              <SidebarCloseIcon data-icon="icon" aria-hidden="true" />
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

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "group inline-flex min-w-0 items-center gap-3 rounded-lg border py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    collapsed ? "size-11 justify-center p-0" : "px-4",
                    isActive
                      ? "border-primary/35 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <AdminNavIcon iconKey={item.icon} />
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
              "rounded-lg border border-border bg-background/45 p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border text-sm font-bold shadow-lg",
                  tierAvatarClassName,
                )}
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
                "w-full rounded-lg text-muted-foreground hover:text-primary",
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

function getTierAvatarClassName(tier: StaffTier): string {
  switch (tier) {
    case "owner":
      return "border-primary/35 bg-primary/10 text-primary shadow-primary/10";
    case "admin":
      return "border-status-break/35 bg-status-break/10 text-status-break shadow-status-break/10";
    case "member":
      return "border-status-cuti/35 bg-status-cuti/10 text-status-cuti shadow-status-cuti/10";
  }
}
