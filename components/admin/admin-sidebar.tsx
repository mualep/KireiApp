"use client";

import Link from "next/link";
import {
  ActivityIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NewspaperIcon,
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
  navItems: AdminShellNavItem[];
  pathname: string;
  staff: {
    name: string;
    email: string;
    tier: StaffTier;
  };
};

export function AdminSidebar({
  navItems,
  pathname,
  staff,
}: AdminSidebarProps) {
  const initials = getInitials(staff.name, staff.email);

  return (
    <aside className="relative px-4 pt-4 lg:fixed lg:inset-y-4 lg:left-4 lg:w-64 lg:px-0 lg:pt-0">
      <Card className="flex min-h-0 flex-col gap-5 rounded-[2rem] border-border/80 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur-xl lg:h-full">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Kireiku Admin Home"
          >
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-lg font-black italic tracking-tighter text-primary shadow-lg shadow-primary/15"
              translate="no"
            >
              [K]
            </span>
            <span className="hidden min-w-0 lg:block">
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
        </div>

        <Separator />

        <nav aria-label="Admin navigation" className="flex flex-col gap-3">
          <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = adminNavIcons[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group inline-flex min-w-max items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors transition-transform focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-w-0",
                    isActive
                      ? "border-primary/35 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <Separator />
          <div className="rounded-2xl border border-border bg-background/45 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary"
                translate="no"
              >
                {initials}
              </span>
              <span className="min-w-0">
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
          </div>
          <LogoutButton>
            <Button
              type="submit"
              variant="ghost"
              className="w-full rounded-2xl text-muted-foreground transition-colors hover:text-primary"
            >
              <LogOutIcon data-icon="inline-start" aria-hidden="true" />
              Logout
            </Button>
          </LogoutButton>
        </div>
      </Card>
    </aside>
  );
}

const adminNavIcons: Record<AdminShellNavItem["icon"], LucideIcon> = {
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
