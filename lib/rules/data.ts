import { createClient } from "@/lib/supabase/server";

export interface EnterpriseRuleDTO {
  id: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getEnterpriseRules(): Promise<EnterpriseRuleDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enterprise_rules")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EnterpriseRuleDTO[];
}
