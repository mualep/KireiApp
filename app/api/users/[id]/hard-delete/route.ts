import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || staff.profile.tier !== "owner") {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya Owner yang berhak menghapus permanen." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { success: false, error: "ID Worker tidak valid." },
        { status: 400 }
      );
    }

    // Protect against owner deleting themselves
    if (targetUserId === staff.profile.id) {
      return NextResponse.json(
        { success: false, error: "Anda tidak dapat menghapus akun Owner sendiri." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch target user's name & email before deletion for audit trail
    const { data: targetUser } = await adminClient
      .from("users")
      .select("id, name, email, tier")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Data worker tidak ditemukan." },
        { status: 404 }
      );
    }

    // Write audit log BEFORE cascade deletion.
    // CRITICAL: set target_user_id to null so the audit log survives the cascade delete!
    await adminClient.from("audit_logs").insert({
      actor_user_id: staff.profile.id,
      target_user_id: null,
      domain: "users",
      action: "users.hard_delete",
      payload_json: {
        deleted_user_id: targetUser.id,
        deleted_user_name: targetUser.name,
        deleted_user_email: targetUser.email,
        deleted_user_tier: targetUser.tier,
      },
    });

    // Delete user from Supabase Auth via Admin API
    // This triggers ON DELETE CASCADE in Postgres, wiping public.users and all linked records!
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      console.error("Auth Admin deleteUser failed:", deleteAuthError.message);
      return NextResponse.json(
        { success: false, error: `Gagal menghapus user dari Supabase Auth: ${deleteAuthError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Worker ${targetUser.name} dan seluruh data historisnya telah dihapus permanen.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
