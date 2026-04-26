import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { canAccessAdminDashboard } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Dashboard Placeholder | Kireiku",
  description: "Release 1 owner and admin placeholder destination.",
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
    <section className="rounded-[2rem] border border-border bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Release 1 Placeholder
      </p>
      <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
        Admin Dashboard
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        This protected destination confirms the Owner/Admin login redirect,
        request guard baseline, and shared admin shell. Dashboard modules are
        deferred.
      </p>
      <Link
        href="/admin/profile"
        className="mt-8 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        View Profile Placeholder
      </Link>
    </section>
  );
}
