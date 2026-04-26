"use client";

import { RadioTowerIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminTopbarProps = {
  dateText: string;
  title: string;
};

export function AdminTopbar({ dateText, title }: AdminTopbarProps) {
  return (
    <header className="sticky top-4 z-20 mx-auto w-full max-w-6xl">
      <Card className="flex flex-row items-center justify-between gap-4 rounded-3xl border-border/80 bg-card/75 px-4 py-3 shadow-xl backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <ShieldCheckIcon
            aria-hidden="true"
            className="hidden text-primary sm:block"
          />
          <p className="truncate font-heading text-base font-bold sm:text-lg">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant="secondary"
            className="border-primary/20 bg-primary/10 text-primary"
          >
            <RadioTowerIcon data-icon="inline-start" aria-hidden="true" />
            LIVE
          </Badge>
          <time className="hidden text-sm tabular-nums text-muted-foreground sm:block">
            {dateText}
          </time>
        </div>
      </Card>
    </header>
  );
}
