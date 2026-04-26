"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getStaffRedirectPath } from "@/lib/auth/redirects";
import { parseStaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";

export type LoginFormState = {
  email?: string;
  message?: string;
};

const GENERIC_LOGIN_ERROR = "Unable to sign in with those credentials.";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function signInStaff(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = getStringValue(formData, "email").trim();
  const parsed = loginSchema.safeParse({
    email,
    password: getStringValue(formData, "password"),
  });

  if (!parsed.success) {
    return {
      email,
      message: "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword(
    parsed.data,
  );

  if (signInError) {
    return {
      email,
      message: GENERIC_LOGIN_ERROR,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();

    return {
      email,
      message: GENERIC_LOGIN_ERROR,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("tier, is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  const tier = parseStaffTier(profile?.tier);

  if (profileError || !profile || profile.is_deleted || !tier) {
    await supabase.auth.signOut();

    return {
      email,
      message: GENERIC_LOGIN_ERROR,
    };
  }

  redirect(getStaffRedirectPath(tier));
}
