import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkerDisplayStatus } from "@/lib/workers";

type TrackerStatusBadgeProps = {
  compact?: boolean;
  prominent?: boolean;
  status: WorkerDisplayStatus;
};

const statusClasses: Record<WorkerDisplayStatus, string> = {
  ALPHA: "tracker-status-alpha",
  BREAK: "tracker-status-break",
  CUTI: "tracker-status-cuti",
  LATE: "tracker-status-late",
  LEMBUR: "tracker-status-lembur",
  OFF: "tracker-status-off",
  ON: "tracker-status-on",
  PENDING: "tracker-status-pending",
  SAKIT: "tracker-status-sakit",
};

export function TrackerStatusBadge({
  compact = false,
  prominent = false,
  status,
}: TrackerStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "tracker-status-badge font-semibold",
        compact && "h-5 px-1.5 text-[0.65rem]",
        prominent && "tracker-status-badge-prominent",
        statusClasses[status],
      )}
      translate="no"
    >
      {status}
    </Badge>
  );
}
