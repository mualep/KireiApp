"use client";

import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminAbsensiError() {
  return (
    <Alert variant="destructive" className="tracker-glass-panel rounded-2xl">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Absensi Could Not Load</AlertTitle>
      <AlertDescription>
        Refresh the page or return after the attendance data is available.
      </AlertDescription>
    </Alert>
  );
}
