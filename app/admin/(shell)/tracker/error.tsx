"use client";

import { RotateCcwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function TrackerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Alert
      variant="destructive"
      className="tracker-glass-panel rounded-2xl border-destructive/30"
    >
      <RotateCcwIcon aria-hidden="true" />
      <AlertTitle>Tracker Could Not Load</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <span>Refresh the page or sign in again.</span>
        <span>
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
