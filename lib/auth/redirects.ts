import type { StaffTier } from "@/lib/auth/tiers";

const STAFF_REDIRECTS: Record<StaffTier, string> = {
  owner: "/admin/dashboard",
  admin: "/admin/dashboard",
  member: "/admin/profile",
};

export function getStaffRedirectPath(tier: StaffTier): string {
  return STAFF_REDIRECTS[tier];
}

export function canAccessAdminDashboard(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin";
}
