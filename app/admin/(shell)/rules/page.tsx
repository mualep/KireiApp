import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getEnterpriseRules } from "@/lib/rules/data";
import { EnterpriseRulesClientShell } from "@/components/admin/rules/enterprise-rules-client-shell";

export const metadata = {
  title: "Enterprise Rules & SOP | KireiApp",
  description: "Daftar peraturan operasional, tata tertib, SOP boosting, dan ketentuan gaji resmi.",
};

export default async function EnterpriseRulesPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  const rules = await getEnterpriseRules();

  return (
    <EnterpriseRulesClientShell
      rules={rules}
      tier={staff.profile.tier}
    />
  );
}
