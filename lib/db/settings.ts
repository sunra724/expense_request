import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { getSettingsMemory, updateSettingsMemory } from "@/lib/db/memory-store";
import type { StampSettings } from "@/lib/types";

function normalizeStampPath(value: unknown, fallback: string, legacyPath?: string) {
  const next = String(value ?? fallback);
  if (legacyPath && next === legacyPath) return fallback;
  return next;
}

function normalizePersonName(value: unknown, fallback: string, legacyName?: string) {
  const next = String(value ?? fallback);
  if (legacyName && next === legacyName) return fallback;
  return next;
}

function normalizeOrganizationName(value: unknown) {
  return String(value ?? "협동조합 소이랩").replace("soilab", "소이랩");
}

function normalizeSettings(row: Record<string, unknown>): StampSettings {
  return {
    id: Number(row.id),
    staff_name: normalizePersonName(row.staff_name, "이형구", "담당자"),
    manager_name: String(row.manager_name ?? "실장"),
    chairperson_name: normalizePersonName(row.chairperson_name, "강아름", "이사장"),
    staff_stamp: normalizeStampPath(row.staff_stamp, "/stamps/lee-hyunggu.png", "/stamps/staff.png"),
    manager_stamp: String(row.manager_stamp ?? "/stamps/manager.png"),
    chairperson_stamp: normalizeStampPath(
      row.chairperson_stamp,
      "/stamps/kang-areum.png",
      "/stamps/chairperson.png",
    ),
    org_name: normalizeOrganizationName(row.org_name),
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
