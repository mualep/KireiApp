import { redirect } from "next/navigation";

import {
  AdminShell,
  type AdminShellNavItem,
} from "@/components/admin/admin-shell";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import type { StaffTier } from "@/lib/auth/tiers";

const ownerAdminNavItems: AdminShellNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/admin/tracker",
    label: "Tracker",
    icon: "tracker",
  },
  {
    href: "/admin/absensi",
    label: "Absensi",
    icon: "absensi",
  },
  {
    href: "/admin/records",
    label: "Records",
    icon: "records",
  },
  {
    href: "/admin/content",
    label: "Content",
    icon: "content",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
  },
];

const memberNavItems: AdminShellNavItem[] = [
  {
    href: "/admin/performance",
    label: "Performance",
    icon: "performance",
  },
];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      dateText={dateFormatter.format(new Date())}
      navItems={getNavItems(staff.profile.tier)}
      staff={{
        name: staff.profile.name,
        email: staff.profile.email,
        tier: staff.profile.tier,
      }}
    >
      {children}
    </AdminShell>
  );
}

function getNavItems(tier: StaffTier): AdminShellNavItem[] {
  return tier === "member" ? memberNavItems : ownerAdminNavItems;
}
