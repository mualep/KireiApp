"use client";

import { UsersTable } from "@/components/admin/users/users-table";
import type { UsersManagerRowDTO } from "@/lib/users/data";

type UsersClientShellProps = {
  currentTier: string;
  initialData: UsersManagerRowDTO[];
};

export function UsersClientShell({
  currentTier,
  initialData,
}: UsersClientShellProps) {
  return <UsersTable currentTier={currentTier} initialData={initialData} />;
}
