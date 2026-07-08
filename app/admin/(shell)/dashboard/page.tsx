import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { canAccessAdminDashboard } from "@/lib/auth/redirects";
import { AdminDashboardClient } from "@/components/admin/dashboard/admin-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard | KireiApp",
  description: "Agregat metrik real-time, ringkasan catatan bulanan, dan log aktivitas terbaru.",
};

export default async function AdminDashboardPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminDashboard(staff.profile.tier)) {
    redirect("/admin/profile");
  }

  return (
    <AdminDashboardClient staffName={staff.profile.name} />
  );
}
