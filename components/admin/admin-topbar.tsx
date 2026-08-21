"use client";

import { MenuIcon } from "lucide-react";

import { AdminNavIcon, type AdminNavIconKey } from "@/components/admin/admin-icons";
import {
  AdminTopbarClock,
  AdminTopbarLiveStatus,
} from "@/components/admin/admin-topbar-live-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminTopbarProps = {
  dateText: string;
  iconKey: AdminNavIconKey;
  onOpenNavigation: () => void;
  title: string;
};

export function AdminTopbar({
  dateText,
  iconKey,
  onOpenNavigation,
  title,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-4 z-30 w-full">
      <Card className="flex flex-row items-center justify-between gap-4 rounded-xl border-border/80 bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 md:hidden [&_svg:not([class*='size-'])]:size-5"
            aria-label="Open Admin Navigation"
            onClick={onOpenNavigation}
          >
            <MenuIcon data-icon="icon" aria-hidden="true" />
          </Button>
          <span
            className="hidden shrink-0 items-center justify-center text-primary sm:flex"
            aria-hidden="true"
          >
            <AdminNavIcon iconKey={iconKey} />
          </span>
          <p className="truncate font-heading text-base font-bold sm:text-lg">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AdminTopbarLiveStatus />
          <ThemeToggle />
          <AdminTopbarClock initialText={dateText} />
        </div>
      </Card>
    </header>
  );
}
