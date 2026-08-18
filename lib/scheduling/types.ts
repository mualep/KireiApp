export type ScheduledAttendanceStatus = "cuti" | "sakit" | "pending" | "alpha";

export interface ScheduledAttendanceDTO {
  id: string;
  user_id: string;
  worker_name?: string;
  target_date: string;
  status: ScheduledAttendanceStatus;
  scheduled_by: string;
  scheduler_name?: string;
  scheduled_at: string;
  applied_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledAttendancePayload {
  user_id: string;
  target_date: string;
  status: ScheduledAttendanceStatus;
  notes?: string;
}
