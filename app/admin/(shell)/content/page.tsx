import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { canAccessAdminContent } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Content Placeholder | Kireiku",
  description: "Release 1 content placeholder destination.",
};

export default async function AdminContentPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminContent(staff.profile.tier)) {
    redirect("/admin/profile");
  }

  return (
    <section className="rounded-[2rem] border border-border bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Release 1 Placeholder
      </p>
      <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
        Content
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        This protected destination reserves the Owner/Admin content workspace.
        Read-only content review is deferred to R1-10B.
      </p>
    </section>
  );
}
