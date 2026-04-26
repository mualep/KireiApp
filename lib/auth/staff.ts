import "server-only";

import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const staffTierSchema = z.enum(["owner", "admin", "member"]);

export type StaffTier = z.infer<typeof staffTierSchema>;

type StaffProfile = {
  id: string;
  tier: StaffTier;
};

type StaffUser = {
  authUser: User;
  profile: StaffProfile;
};

export async function getCurrentStaffUser(): Promise<StaffUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, tier, is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  const parsedTier = staffTierSchema.safeParse(profile?.tier);

  if (profileError || !profile || profile.is_deleted || !parsedTier.success) {
    return null;
  }

  return {
    authUser: user,
    profile: {
      id: profile.id,
      tier: parsedTier.data,
    },
  };
}
