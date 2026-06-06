import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Profile Placeholder | KireiApp",
  description: "Release 1 staff profile placeholder destination.",
};

export default async function AdminProfilePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  return (
    <section className="rounded-[2rem] border border-border bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Release 1 Placeholder
      </p>
      <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
        Staff Profile
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        This protected destination confirms the staff login redirect, shared
        shell, and coarse request guard baseline. The editable profile UI is
        deferred.
      </p>
    </section>
  );
}
