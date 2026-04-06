import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type { Organization, Project } from "@/lib/types";
import {
  createOrganizationMemory,
  createProjectMemory,
  getOrganizationMemory,
  getProjectMemory,
  listOrganizationsMemory,
  listProjectsMemory,
} from "@/lib/db/memory-store";

function normalizeOrganization(row: Record<string, unknown>): Organization {
  return {
    id: Number(row.id),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    business_account_note: String(row.business_account_note ?? ""),
    direct_cost_account_note: String(row.direct_cost_account_note ?? ""),
    indirect_cost_account_note: String(row.indirect_cost_account_note ?? ""),
    default_template_code: String(row.default_template_code ?? "default"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeProject(row: Record<string, unknown>): Project {
  return {
    id: Number(row.id),
    organization_id: Number(row.organization_id ?? 0),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    starts_on: String(row.starts_on ?? ""),
    ends_on: String(row.ends_on ?? ""),
    guideline_code: String(row.guideline_code ?? "youth-dadareum-2026"),
    direct_budget_total: Number(row.direct_budget_total ?? 0),
    indirect_budget_total: Number(row.indirect_budget_total ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listOrganizations() {
  if (!hasSupabaseEnv()) return listOrganizationsMemory();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("organizations").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map((row) => normalizeOrganization(row));
  } catch {
    return listOrganizationsMemory();
  }
}

export async function getOrganization(id: number) {
  if (!hasSupabaseEnv()) return getOrganizationMemory(id);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
    if (error) return null;
    return normalizeOrganization(data);
  } catch {
    return getOrganizationMemory(id);
  }
}

export async function createOrganization(input: Omit<Organization, "id" | "created_at" | "updated_at">) {
  if (!hasSupabaseEnv()) return createOrganizationMemory(input);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("organizations").insert(input).select("*").single();
    if (error) throw error;
    return normalizeOrganization(data);
  } catch {
    return createOrganizationMemory(input);
  }
}

export async function listProjects(organizationId?: number | null) {
  if (!hasSupabaseEnv()) return listProjectsMemory(organizationId);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("projects").select("*").order("name");
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => normalizeProject(row));
  } catch {
    return listProjectsMemory(organizationId);
  }
}

export async function getProject(id: number) {
  if (!hasSupabaseEnv()) return getProjectMemory(id);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) return null;
    return normalizeProject(data);
  } catch {
    return getProjectMemory(id);
  }
}

export async function createProject(input: Omit<Project, "id" | "created_at" | "updated_at">) {
  if (!hasSupabaseEnv()) return createProjectMemory(input);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("projects").insert(input).select("*").single();
    if (error) throw error;
    return normalizeProject(data);
  } catch {
    return createProjectMemory(input);
  }
}
