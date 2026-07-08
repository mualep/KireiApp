"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit-logger";

export async function signOutStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAudit(user.id, "auth", "logout");
  }

  await supabase.auth.signOut();

  redirect("/admin/login");
}
