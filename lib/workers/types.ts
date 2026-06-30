import type {
  workerDisplayStatuses,
  workerRoles,
  workerShifts,
  workerStoredStatuses,
} from "@/lib/workers/constants";

export type WorkerRole = (typeof workerRoles)[number];
export type WorkerShift = (typeof workerShifts)[number];
export type WorkerStoredStatus = (typeof workerStoredStatuses)[number];
export type WorkerDisplayStatus = (typeof workerDisplayStatuses)[number];

export type WorkerShiftDefinition = {
  endHour: number | null;
  endMinute: number | null;
  isFlexible: boolean;
  label: WorkerShift;
  startHour: number | null;
  startMinute: number | null;
};

export type WorkerProfileInput = {
  employeeRole: string;
  gid: string;
  isFlexible: boolean;
  shift: string;
  shiftEndHour: number | null;
  shiftEndMinute: number | null;
  shiftStartHour: number | null;
  shiftStartMinute: number | null;
};

export type WorkerProfileDTO = {
  createdAt: string;
  cutiStock: number;
  employeeRole: WorkerRole;
  gid: string;
  isFlexible: boolean;
  shift: WorkerShift;
  shiftEndHour: number | null;
  shiftEndMinute: number | null;
  shiftStartHour: number | null;
  shiftStartMinute: number | null;
  showCard: boolean;
  updatedAt: string;
  userId: string;
};

export type WorkerStatusDTO = {
  alphaDone: boolean;
  breakAccumulatedSecs: number;
  breakLateRecorded: boolean;
  breakStartedAt: string | null;
  breakTimerRunning: boolean;
  currentStatus: WorkerStoredStatus;
  cutiSetDate: string | null;
  lemburStartedAt: string | null;
  pendingStartedAt: string | null;
  sakitStartedAt: string | null;
  shiftActiveDate: string | null;
  shiftActiveEndHour: number | null;
  shiftActiveEndMinute: number | null;
  shiftActiveLabel: WorkerShift | null;
  shiftActiveStartHour: number | null;
  shiftActiveStartMinute: number | null;
  shiftActiveStartedAt: string | null;
  updatedAt: string;
  userId: string;
  version: number;
};

export type TrackerCardDTO = {
  activeSpCount: number;
  activeTrackerAttendanceId: string | null;
  breakAccumulatedSecs: number;
  breakLateSeconds: number;
  breakStartedAt: string | null;
  breakTimerRunning: boolean;
  cutiStock: number;
  displayStatus: WorkerDisplayStatus;
  employeeRole: WorkerRole;
  gid: string;
  alphaCount: number;
  absenceMaterializationMissingDays: number;
  isFlexible: boolean;
  isAbsenceMaterializationAvailable: boolean;
  isExpiredAbsenceCloseAvailable: boolean;
  isTrackerCorrectionAvailable: boolean;
  lemburUnits: number;
  name: string;
  pendingDays: number;
  sakitDays: number;
  shift: WorkerShift;
  showCard: boolean;
  statusUpdatedAt: string;
  storedStatus: WorkerStoredStatus;
  userId: string;
  version: number;
  workLateSeconds: number;
};
