"use client";

import {
  DailyTaskReviewTable,
  type TaskRecord,
} from "@/components/admin/daily-task/daily-task-review-table";

type DailyTaskReviewClientShellProps = {
  initialTasks: TaskRecord[];
  selectedDate: string;
};

export function DailyTaskReviewClientShell({
  initialTasks,
  selectedDate,
}: DailyTaskReviewClientShellProps) {
  return (
    <DailyTaskReviewTable
      initialTasks={initialTasks}
      selectedDate={selectedDate}
    />
  );
}
