import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersTable } from "@/components/admin/users/users-table";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getUsersManagerList } from "@/lib/users/data";

export const metadata: Metadata = {
  title: "Users Manager | KireiApp",
  description: "Manage system users and SPs.",
};

export default async function AdminUsersPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  // Member Access Blocked
  if (staff.profile.tier === "member") {
    redirect("/admin/dashboard");
  }

  const rows = await getUsersManagerList();
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users Manager</h1>
        <p className="text-muted-foreground mt-2">
          Manage system users, workers, and SP records.
        </p>
      </div>

      <UsersTable rows={rows} currentTier={staff.profile.tier} />
    </div>
  );
}
