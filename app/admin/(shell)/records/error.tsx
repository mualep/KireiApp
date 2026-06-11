"use client";

import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminRecordsError() {
  return (
    <Alert variant="destructive" className="tracker-glass-panel rounded-2xl">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Records Could Not Load</AlertTitle>
      <AlertDescription>
        Refresh the page or return after monthly records are available.
      </AlertDescription>
    </Alert>
  );
}
