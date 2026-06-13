"use client";

import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPerformanceError() {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Performance could not load.</AlertTitle>
      <AlertDescription>
        The read-only member performance shell is unavailable right now.
      </AlertDescription>
    </Alert>
  );
}
