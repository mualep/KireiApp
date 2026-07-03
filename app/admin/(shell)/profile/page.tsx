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
import { UpdateCredentialsDialog } from "@/components/admin/profile/update-credentials-form";
import { cn } from "@/lib/utils";
import type { StaffTier } from "@/lib/auth/tiers";

export const metadata: Metadata = {
  title: "Profile | KireiApp",
  description: "User profile details with credentials update.",
};

const tierTextColorClasses: Record<StaffTier, string> = {
  owner: "text-status-alpha",
  admin: "text-status-break",
  member: "text-status-cuti",
};

const tierBorderBgColorClasses: Record<StaffTier, string> = {
  owner: "border-primary/35 bg-primary/10 text-primary",
  admin: "border-status-break/35 bg-status-break/10 text-status-break",
  member: "border-status-cuti/35 bg-status-cuti/10 text-status-cuti",
};

export default async function AdminProfilePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  const staffSelfId = staff.profile.id;
  const data = await getMemberProfileData(staff);
  const workerProfile = data.workerProfile;

  // Extract initials for the circular avatar
  const nameParts = data.staff.name.split(" ").filter(Boolean);
  const initials = (
    nameParts.slice(0, 2).map((part) => part[0]).join("") || 
    data.staff.email.slice(0, 2)
  ).toUpperCase();

  // Hide worker details if user is an Owner or Admin and has no linked worker profile
  const showWorkerDetails = workerProfile !== null && workerProfile !== undefined;

  const detailRows = [
    ["Nama Tampilan", data.staff.name],
    ["Email", data.staff.email],
    ["Staff Tier", data.staff.tier.toUpperCase()],
    ...(showWorkerDetails ? [
      ["Worker Role", workerProfile.employeeRole],
      ["Shift", workerProfile.roleShiftLabel],
      ["Shift Time", workerProfile.shiftTimeLabel ?? "Flexible"],
      ["Cuti Stock", `${workerProfile.cutiStock}x tersedia`],
    ] : []),
  ];

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
      {/* Top action header without H1 */}
      <div className="flex justify-end items-center px-1">
        <UpdateCredentialsDialog currentEmail={data.staff.email} />
      </div>

      {/* Centered Codex-Style Profile Card */}
      <Card className="tracker-glass-panel rounded-xl border p-8 flex flex-col items-center text-center shadow-xl shadow-primary/5">
        {/* Large circular initials avatar */}
        <div className="my-4">
          <div className={cn(
            "flex size-28 items-center justify-center rounded-full border text-4xl font-medium transition-transform hover:scale-105",
            tierBorderBgColorClasses[data.staff.tier]
          )}>
            {initials}
          </div>
        </div>

        {/* User identification */}
        <h2 className="text-xl font-semibold tracking-tight mt-2" translate="no">
          {data.staff.name}
        </h2>
        <p className="text-sm text-muted-foreground mt-1" translate="no">
          {data.staff.email}
        </p>
        <Badge
          variant="outline"
          className={cn(
            "mt-4 h-6 border-border px-4 text-xs font-bold uppercase tracking-wider",
            tierTextColorClasses[data.staff.tier]
          )}
        >
          {data.staff.tier}
        </Badge>
      </Card>

      {/* Details Grid */}
      <Card className="tracker-glass-panel rounded-xl border">
        <CardHeader>
          <CardTitle>Detail Profil</CardTitle>
          <CardDescription>
            Informasi lengkap mengenai profil dan hak akses Anda di KireiApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border/75 bg-background/35 p-4 text-left"
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
            <div className="mt-4 rounded-lg border border-border bg-background/35 p-3 text-sm text-muted-foreground text-left">
              {data.issues[0]}
            </div>
          ) : null}
          <p className="sr-only">Self profile id: {staffSelfId}</p>
        </CardContent>
      </Card>
    </div>
  );
}
