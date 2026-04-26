import "server-only";

import type { User } from "@supabase/supabase-js";

import { parseStaffTier, type StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = {
  id: string;
  name: string;
  email: string;
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
    .select("id, name, email, tier, is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  const tier = parseStaffTier(profile?.tier);

  if (profileError || !profile || profile.is_deleted || !tier) {
    return null;
  }

  return {
    authUser: user,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      tier,
    },
  };
}
