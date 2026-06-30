import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { getMemberProfileData } from "@/lib/member-profile/data";

export const metadata: Metadata = {
  title: "Worker Profile | KireiApp",
  description: "Read-only staff worker profile.",
};

type ProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function WorkerProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  // Member Boundary Guard: Members can only view their own profile.
  // Redirect them to '/admin/profile' if they try to access another worker's ID.
  if (staff.profile.tier === "member" && staff.profile.id !== userId) {
    redirect("/admin/profile");
  }

  // Fetch the target user details from database
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,name,email,tier")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    redirect("/admin/profile");
  }

  // Construct a dummy staff object for getMemberProfileData helper
  const targetStaff = {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
    },
  };

  const data = await getMemberProfileData(targetStaff);
  const workerProfile = data.workerProfile;
  const detailRows = [
    ["Display Name", data.staff.name],
    ["Email", data.staff.email],
    ["Staff Tier", data.staff.tier.toUpperCase()],
    ["Worker Role", workerProfile?.employeeRole ?? "Not linked"],
    ["Shift", workerProfile?.roleShiftLabel ?? "Not linked"],
    ["Shift Time", workerProfile?.shiftTimeLabel ?? "Flexible or not linked"],
    [
      "Cuti Stock",
      workerProfile ? `${workerProfile.cutiStock}x available` : "Not linked",
    ],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <section className="tracker-glass-panel rounded-xl border p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="h-6 border-status-cuti/35 bg-status-cuti/10 text-status-cuti"
              >
                Worker Profile
              </Badge>
              <Badge
                variant="outline"
                className="h-6 border-border bg-background/35 text-muted-foreground"
              >
                Read-only
              </Badge>
            </div>
            <h1
              className="mt-3 truncate font-heading text-3xl font-black tracking-tight"
              translate="no"
            >
              {data.staff.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This page shows the profile information of the selected worker. Profile editing is not enabled in this slice.
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-7 border-border bg-background/35 px-2.5 text-xs uppercase text-muted-foreground"
          >
            {data.staff.tier}
          </Badge>
        </div>
      </section>

      <Card className="tracker-glass-panel rounded-xl border">
        <CardHeader>
          <CardTitle>Staff Profile Details</CardTitle>
          <CardDescription>
            Detailed view of worker identity and shift parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {detailRows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border/75 bg-background/35 p-3"
              >
                <dt className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </dt>
                <dd
                  className="mt-1 min-w-0 truncate font-sans text-sm font-bold text-foreground"
                  translate="no"
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {data.issues.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-background/35 p-3 text-sm text-muted-foreground">
              {data.issues[0]}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
