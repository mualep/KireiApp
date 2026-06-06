"use client";

import { MenuIcon } from "lucide-react";

import { AdminNavIcon, type AdminNavIconKey } from "@/components/admin/admin-icons";
import {
  AdminTopbarClock,
  AdminTopbarLiveStatus,
} from "@/components/admin/admin-topbar-live-status";
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
      <Card className="flex flex-row items-center justify-between gap-4 rounded-xl border-border/80 bg-card/75 px-4 py-3 shadow-xl backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 md:hidden"
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
          <AdminTopbarClock initialText={dateText} />
        </div>
      </Card>
    </header>
  );
}
