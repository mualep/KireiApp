import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit(
  actorId: string,
  domain: string,
  action: string,
  targetUserId?: string | null,
  payload?: Record<string, unknown> | null
) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("audit_logs").insert({
      actor_user_id: actorId,
      domain,
      action,
      target_user_id: targetUserId || null,
      payload_json: payload || {},
    });
    if (error) {
      console.error(`[logAudit] Failed to insert audit log:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[logAudit] Error logging audit event:`, err);
    return false;
  }
}
