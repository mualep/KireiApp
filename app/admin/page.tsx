import { redirect } from "next/navigation";

import { getStaffRedirectPath } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export default async function AdminIndexPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  redirect(getStaffRedirectPath(staff.profile.tier));
}
