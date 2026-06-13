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

export function canAccessAdminContent(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin";
}

export function canAccessAdminPerformance(tier: StaffTier): boolean {
  return tier === "member";
}

export function canAccessAdminAbsensi(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin" || tier === "member";
}

export function canAccessAdminRecords(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin" || tier === "member";
}
