import { z } from "zod";

export const staffTierSchema = z.enum(["owner", "admin", "member"]);

export type StaffTier = z.infer<typeof staffTierSchema>;

export function parseStaffTier(value: unknown): StaffTier | null {
  const parsed = staffTierSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
