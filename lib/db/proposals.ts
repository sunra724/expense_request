import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type { Proposal, ProposalInput } from "@/lib/types";
import {
  batchProposalMemory,
  createProposalMemory,
  deleteProposalMemory,
  getProposalMemory,
  listProposalsMemory,
  updateProposalMemory,
} from "@/lib/db/memory-store";

function normalizeProposal(row: Record<string, unknown>): Proposal {
  return {
    id: Number(row.id),
    doc_number: String(row.doc_number ?? ""),
    fund_type: (row.fund_type as Proposal["fund_type"]) ?? "grant",
    project_name: String(row.project_name ?? ""),
    project_period: String(row.project_period ?? ""),
    total_amount: Number(row.total_amount ?? 0),
    related_plan: String(row.related_plan ?? ""),
    org_name: String(row.org_name ?? ""),
    submission_date: String(row.submission_date ?? ""),
    items: Array.isArray(row.items) ? (row.items as Proposal["items"]) : [],
    status: (row.status as Proposal["status"]) ?? "draft",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listProposals() {
  if (!hasSupabaseEnv()) return listProposalsMemory();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeProposal(row));
}

export async function getProposal(id: number) {
  if (!hasSupabaseEnv()) return getProposalMemory(id);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).single();
  if (error) return null;
  return normalizeProposal(data);
}

export async function createProposal(input: ProposalInput) {
  if (!hasSupabaseEnv()) return createProposalMemory(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").insert(input).select("*").single();
  if (error) throw error;
  return normalizeProposal(data);
}

export async function updateProposal(id: number, input: ProposalInput) {
  if (!hasSupabaseEnv()) return updateProposalMemory(id, input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proposals")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  return normalizeProposal(data);
}

export async function deleteProposal(id: number) {
  if (!hasSupabaseEnv()) {
    deleteProposalMemory(id);
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

export async function batchProposals(ids: number[]) {
  if (!hasSupabaseEnv()) return batchProposalMemory(ids);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").in("id", ids).order("id");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeProposal(row));
}
