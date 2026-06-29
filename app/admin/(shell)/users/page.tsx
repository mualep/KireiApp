import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersTable } from "@/components/admin/users/users-table";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getUsersManagerList } from "@/lib/users/data";

export const metadata: Metadata = {
  title: "Users Manager | KireiApp",
  description: "Kelola akun worker, tier, dan Surat Peringatan (SP).",
};

export default async function AdminUsersPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (staff.profile.tier === "member") {
    redirect("/admin/dashboard");
  }

  const rows = await getUsersManagerList();

  return (
    <main className="flex flex-1 flex-col gap-4">
      <UsersTable initialData={rows} currentTier={staff.profile.tier} />
    </main>
  );
}
