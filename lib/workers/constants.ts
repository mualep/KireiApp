export const workerRoles = [
  "Professional Player",
  "Expert Player",
  "Internship",
  "Customer Service",
  "Explorer",
  "Security",
  "Cleaning Service",
] as const;

export const workerShifts = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "1",
  "2",
  "3",
  "flexible",
] as const;

export const workerStoredStatuses = [
  "off",
  "on",
  "break",
  "cuti",
  "sakit",
  "pending",
  "lembur",
] as const;

export const workerDisplayStatuses = [
  "OFF",
  "ON",
  "BREAK",
  "CUTI",
  "SAKIT",
  "PENDING",
  "LEMBUR",
  "LATE",
  "ALPHA",
] as const;

export const workerShiftDefinitions = {
  A: {
    endHour: 14,
    endMinute: 0,
    isFlexible: false,
    label: "A",
    startHour: 6,
    startMinute: 0,
  },
  B: {
    endHour: 16,
    endMinute: 0,
    isFlexible: false,
    label: "B",
    startHour: 8,
    startMinute: 0,
  },
  C: {
    endHour: 22,
    endMinute: 0,
    isFlexible: false,
    label: "C",
    startHour: 14,
    startMinute: 0,
  },
  D: {
    endHour: 0,
    endMinute: 0,
    isFlexible: false,
    label: "D",
    startHour: 16,
    startMinute: 0,
  },
  E: {
    endHour: 6,
    endMinute: 0,
    isFlexible: false,
    label: "E",
    startHour: 22,
    startMinute: 0,
  },
  F: {
    endHour: 8,
    endMinute: 0,
    isFlexible: false,
    label: "F",
    startHour: 0,
    startMinute: 0,
  },
  "1": {
    endHour: 15,
    endMinute: 0,
    isFlexible: false,
    label: "1",
    startHour: 7,
    startMinute: 0,
  },
  "2": {
    endHour: 23,
    endMinute: 0,
    isFlexible: false,
    label: "2",
    startHour: 15,
    startMinute: 0,
  },
  "3": {
    endHour: 7,
    endMinute: 0,
    isFlexible: false,
    label: "3",
    startHour: 23,
    startMinute: 0,
  },
  flexible: {
    endHour: null,
    endMinute: null,
    isFlexible: true,
    label: "flexible",
    startHour: null,
    startMinute: null,
  },
} as const;

export const workerStatusDisplayLabels = {
  break: "BREAK",
  cuti: "CUTI",
  lembur: "LEMBUR",
  off: "OFF",
  on: "ON",
  pending: "PENDING",
  sakit: "SAKIT",
} as const;

