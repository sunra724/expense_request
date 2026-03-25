import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { getSettingsMemory, updateSettingsMemory } from "@/lib/db/memory-store";
import type { StampSettings } from "@/lib/types";

function normalizeSettings(row: Record<string, unknown>): StampSettings {
  return {
    id: Number(row.id),
    staff_name: String(row.staff_name ?? "담당자"),
    manager_name: String(row.manager_name ?? "실장"),
    chairperson_name: String(row.chairperson_name ?? "이사장"),
    staff_stamp: String(row.staff_stamp ?? "/stamps/staff.png"),
    manager_stamp: String(row.manager_stamp ?? "/stamps/manager.png"),
    chairperson_stamp: String(row.chairperson_stamp ?? "/stamps/chairperson.png"),
    org_name: String(row.org_name ?? "협동조합 소이랩"),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getSettings() {
  if (!hasSupabaseEnv()) return getSettingsMemory();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("stamp_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return normalizeSettings(data);
}

export async function updateSettings(input: Partial<StampSettings>) {
  if (!hasSupabaseEnv()) return updateSettingsMemory(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("stamp_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeSettings(data);
}
