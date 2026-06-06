"use client";

import { MenuIcon } from "lucide-react";

import { AdminNavIcon, type AdminNavIconKey } from "@/components/admin/admin-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminLiveSignalStatus =
  | "bad"
  | "disconnected"
  | "good"
  | "slow"
  | "warning";

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
    <header className="sticky top-4 z-20 w-full">
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
          <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary sm:flex">
            <AdminNavIcon iconKey={iconKey} />
          </span>
          <p className="truncate font-heading text-base font-bold sm:text-lg">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AdminLiveSignal />
          <time className="hidden text-sm tabular-nums text-muted-foreground sm:block">
            {dateText}
          </time>
        </div>
      </Card>
    </header>
  );
}

const signalStatusClasses: Record<AdminLiveSignalStatus, string> = {
  bad: "bg-destructive shadow-destructive/40",
  disconnected: "bg-muted-foreground shadow-muted-foreground/30",
  good: "bg-status-on shadow-status-on/40",
  slow: "bg-orange-400 shadow-orange-400/40",
  warning: "bg-yellow-400 shadow-yellow-400/40",
};

function AdminLiveSignal({
  status = "good",
}: {
  status?: AdminLiveSignalStatus;
}) {
  return (
    <div
      aria-label={`Connection signal: ${status}`}
      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      role="status"
    >
      <span className="relative flex size-3" aria-hidden="true">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-45 motion-reduce:animate-none",
            signalStatusClasses[status],
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-3 rounded-full shadow-lg",
            signalStatusClasses[status],
          )}
        />
      </span>
      <span className="hidden sm:inline">Signal</span>
    </div>
  );
}
