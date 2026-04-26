import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Profile Placeholder | Kireiku",
  description: "Release 1 staff profile placeholder destination.",
};

export default async function AdminProfilePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Release 1 Placeholder
        </p>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
          Staff Profile
        </h1>
        <p className="mt-4 text-muted-foreground">
          This protected destination confirms the staff login redirect and coarse
          request guard baseline. The editable profile UI is deferred.
        </p>
      </section>
    </main>
  );
}
