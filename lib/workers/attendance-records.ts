export const workerAttendanceStatuses = [
  "hadir",
  "cuti",
  "sakit",
  "pending",
  "alpha",
] as const;

export const workerAttendanceSources = ["tracker", "absensi", "cron", "system"] as const;

export type WorkerAttendanceStatus = (typeof workerAttendanceStatuses)[number];
export type WorkerAttendanceSource = (typeof workerAttendanceSources)[number];

export type WorkerAttendanceRowDTO = {
  attendanceDate: string;
  createdAt: string;
  id: string;
  source: WorkerAttendanceSource;
  sourceAction: string;
  status: WorkerAttendanceStatus;
  updatedAt: string;
  userId: string;
};

export type WorkerRecordRowDTO = {
  alphaCount: number;
  alphaOverrideCount: number | null;
  breakLateOverrideSeconds: number | null;
  breakLateSeconds: number;
  createdAt: string;
  cutiStockOverrideSnapshot: number | null;
  cutiStockSnapshot: number | null;
  id: string;
  lastSource: WorkerAttendanceSource | null;
  lastSourceAction: string | null;
  lemburOverrideUnits: number | null;
  lemburUnits: number;
  pendingDays: number;
  pendingOverrideDays: number | null;
  periodMonth: string;
  sakitDays: number;
  sakitOverrideDays: number | null;
  updatedAt: string;
  userId: string;
  workLateOverrideSeconds: number | null;
  workLateSeconds: number;
};
