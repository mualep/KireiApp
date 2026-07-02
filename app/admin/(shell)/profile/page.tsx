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
import { getMemberProfileData } from "@/lib/member-profile/data";
import { UpdateCredentialsForm } from "@/components/admin/profile/update-credentials-form";

export const metadata: Metadata = {
  title: "Profile | KireiApp",
  description: "Read-only staff self profile with credentials update.",
};

export default async function AdminProfilePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  const staffSelfId = staff.profile.id;
  const data = await getMemberProfileData(staff);
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
                Self-only
              </Badge>
              <Badge
                variant="outline"
                className="h-6 border-border bg-background/35 text-muted-foreground"
              >
                Editable Credentials
              </Badge>
            </div>
            <h1
              className="mt-3 truncate font-heading text-3xl font-black tracking-tight"
              translate="no"
            >
              {data.staff.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This page shows your current staff identity and linked worker
              profile data. You can also update your email credentials prefix and password below.
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
          <CardTitle>Staff Profile</CardTitle>
          <CardDescription>
            Profile details for current staff account.
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
          <p className="sr-only">Self profile id: {staffSelfId}</p>
        </CardContent>
      </Card>

      <UpdateCredentialsForm currentEmail={data.staff.email} />
    </div>
  );
}
