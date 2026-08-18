import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberDashboardClient } from "@/components/admin/performance/member-dashboard-client";
import { canAccessAdminPerformance, getStaffRedirectPath } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getMemberPerformanceData } from "@/lib/performance/data";

export const metadata: Metadata = {
  title: "Performance Member | KireiApp",
  description: "Member personal performance dashboard with daily checklist and attendance calendar.",
};

export default async function AdminPerformancePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminPerformance(staff.profile.tier)) {
    redirect(getStaffRedirectPath(staff.profile.tier));
  }

  // Fetch real data strictly scoped to the authenticated member's ID
  const data = await getMemberPerformanceData(staff.profile.id);

  return <MemberDashboardClient data={data} />;
}
