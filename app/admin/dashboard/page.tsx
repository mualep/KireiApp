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
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Release 1 Placeholder
        </p>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
          Admin Dashboard
        </h1>
        <p className="mt-4 text-muted-foreground">
          This protected destination confirms the Owner/Admin login redirect and
          request guard baseline. The full admin shell and dashboard modules are
          deferred.
        </p>
        <Link
          href="/admin/profile"
          className="mt-8 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          View Profile Placeholder
        </Link>
      </section>
    </main>
  );
}
