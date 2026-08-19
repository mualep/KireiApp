"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export async function updateEnterpriseRuleAction({
  id,
  title,
  content,
  category = "general",
  sort_order,
}: {
  id: string;
  title: string;
  content: string;
  category?: string;
  sort_order?: number;
}) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || staff.profile.tier !== "owner") {
      return { ok: false, error: "Hanya Owner yang diizinkan mengedit peraturan perusahaan." };
    }

    if (!id || !title.trim() || !content.trim()) {
      return { ok: false, error: "Judul dan isi peraturan tidak boleh kosong." };
    }

    const supabase = await createClient();
    const updatePayload: Record<string, any> = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      updated_at: new Date().toISOString(),
    };

    if (typeof sort_order === "number") {
      updatePayload.sort_order = sort_order;
    }

    const { error } = await supabase
      .from("enterprise_rules")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/rules");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui peraturan.",
    };
  }
}

export async function createEnterpriseRuleAction({
  title,
  content,
  category = "Umum",
  sort_order = 0,
}: {
  title: string;
  content: string;
  category?: string;
  sort_order?: number;
}) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || staff.profile.tier !== "owner") {
      return { ok: false, error: "Hanya Owner yang diizinkan membuat peraturan baru." };
    }

    if (!title.trim() || !content.trim()) {
      return { ok: false, error: "Judul dan isi peraturan tidak boleh kosong." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("enterprise_rules").insert({
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      sort_order,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/rules");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan peraturan.",
    };
  }
}

export async function deleteEnterpriseRuleAction(id: string) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || staff.profile.tier !== "owner") {
      return { ok: false, error: "Hanya Owner yang diizinkan menghapus peraturan." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("enterprise_rules")
      .delete()
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/rules");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menghapus peraturan.",
    };
  }
}
