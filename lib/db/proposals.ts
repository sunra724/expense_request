import { createDefaultProposalGuidelineFields } from "@/lib/document-defaults";
import {
  deleteProposalGuidelineMeta,
  fetchProposalGuidelineMeta,
  fetchProposalGuidelineMetaMap,
  normalizeProposalGuidelineMeta,
  upsertProposalGuidelineMeta,
} from "@/lib/db/guideline-metadata";
import { embedProposalInlineMeta, extractProposalInlineMeta } from "@/lib/db/inline-guideline-meta";
import {
  batchProposalMemory,
  createProposalMemory,
  deleteProposalMemory,
  getProposalMemory,
  listProposalsMemory,
  updateProposalMemory,
} from "@/lib/db/memory-store";
import { defaultEvidenceChecklist } from "@/lib/guideline";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type { Proposal, ProposalInput } from "@/lib/types";

function inferBudgetScope(row: Record<string, unknown>): Proposal["budget_scope"] {
  const docNumber = String(row.doc_number ?? "");
  if (docNumber.includes("간접")) return "indirect";
  if (docNumber.includes("직접")) return "direct";
  return "direct";
}

function baseGuidelineFallback(row: Record<string, unknown>) {
  const totalAmount = Number(row.total_amount ?? 0);
  const paymentMethod: Proposal["payment_method"] = "account_transfer";

  return {
    ...createDefaultProposalGuidelineFields(),
    budget_scope: inferBudgetScope(row),
    planned_payment_date: String(row.submission_date ?? ""),
    payment_method: paymentMethod,
    supply_amount: totalAmount,
    eligible_amount: totalAmount,
    evidence_checklist: defaultEvidenceChecklist(paymentMethod),
  };
}

function normalizeProposal(row: Record<string, unknown>, meta?: unknown | null): Proposal {
  const inline = extractProposalInlineMeta(row.items);
  const guideline = normalizeProposalGuidelineMeta(meta ?? inline.meta, baseGuidelineFallback(row));

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
    items: inline.items,
    status: (row.status as Proposal["status"]) ?? "draft",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    ...guideline,
  };
}

function toProposalRow(input: ProposalInput) {
  return {
    doc_number: input.doc_number,
    fund_type: input.fund_type,
    project_name: input.project_name,
    project_period: input.project_period,
    total_amount: input.total_amount,
    related_plan: input.related_plan,
    org_name: input.org_name,
    submission_date: input.submission_date || null,
    items: embedProposalInlineMeta(input.items, input),
    status: input.status,
  };
}

export async function listProposals() {
  if (!hasSupabaseEnv()) return listProposalsMemory();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").order("id", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const metaMap = await fetchProposalGuidelineMetaMap(rows.map((row) => Number(row.id)));
  return rows.map((row) => normalizeProposal(row, metaMap.get(Number(row.id)) ?? null));
}

export async function getProposal(id: number) {
  if (!hasSupabaseEnv()) return getProposalMemory(id);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).single();
  if (error) return null;

  const meta = await fetchProposalGuidelineMeta(id);
  return normalizeProposal(data, meta);
}

export async function createProposal(input: ProposalInput) {
  if (!hasSupabaseEnv()) return createProposalMemory(input);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").insert(toProposalRow(input)).select("*").single();
  if (error) throw error;

  const created = normalizeProposal(data, input);
  await upsertProposalGuidelineMeta(created.id, input);
  return created;
}

export async function updateProposal(id: number, input: ProposalInput) {
  if (!hasSupabaseEnv()) return updateProposalMemory(id, input);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proposals")
    .update({ ...toProposalRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;

  const updated = normalizeProposal(data, input);
  await upsertProposalGuidelineMeta(id, input);
  return updated;
}

export async function deleteProposal(id: number) {
  if (!hasSupabaseEnv()) {
    deleteProposalMemory(id);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
  await deleteProposalGuidelineMeta(id);
}

export async function batchProposals(ids: number[]) {
  if (!hasSupabaseEnv()) return batchProposalMemory(ids);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proposals").select("*").in("id", ids).order("id");
  if (error) throw error;

  const rows = data ?? [];
  const metaMap = await fetchProposalGuidelineMetaMap(rows.map((row) => Number(row.id)));
  return rows.map((row) => normalizeProposal(row, metaMap.get(Number(row.id)) ?? null));
}
