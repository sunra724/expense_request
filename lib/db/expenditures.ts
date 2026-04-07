import {
  normalizeEvidenceAttachmentSheet,
  normalizePhotoAttachmentSheet,
} from "@/lib/attachment-sheets";
import { createDefaultExpenditureGuidelineFields } from "@/lib/document-defaults";
import {
  deleteExpenditureGuidelineMeta,
  fetchExpenditureGuidelineMeta,
  fetchExpenditureGuidelineMetaMap,
  normalizeExpenditureGuidelineMeta,
  upsertExpenditureGuidelineMeta,
} from "@/lib/db/guideline-metadata";
import { embedExpenditureInlineMeta, extractExpenditureInlineMeta } from "@/lib/db/inline-guideline-meta";
import {
  batchExpenditureMemory,
  createExpenditureMemory,
  deleteExpenditureMemory,
  getExpenditureMemory,
  listExpendituresMemory,
  updateExpenditureMemory,
} from "@/lib/db/memory-store";
import { defaultEvidenceChecklist, normalizePaymentMethod, paymentMethodLabel } from "@/lib/guideline";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type { Expenditure, ExpenditureInput } from "@/lib/types";

function inferBudgetScope(row: Record<string, unknown>): Expenditure["budget_scope"] {
  const docNumber = String(row.doc_number ?? "");
  if (docNumber.includes("간접")) return "indirect";
  if (docNumber.includes("직접")) return "direct";
  return "direct";
}

function baseGuidelineFallback(row: Record<string, unknown>) {
  const totalAmount = Number(row.total_amount ?? 0);
  const paymentMethod = normalizePaymentMethod(row.payment_method);

  return {
    ...createDefaultExpenditureGuidelineFields(),
    budget_scope: inferBudgetScope(row),
    payment_method: paymentMethod,
    supply_amount: totalAmount,
    eligible_amount: totalAmount,
    evidence_checklist: defaultEvidenceChecklist(paymentMethod),
  };
}

function normalizeExpenditure(row: Record<string, unknown>, meta?: unknown | null): Expenditure {
  const projectName = String(row.project_name ?? "");
  const inline = extractExpenditureInlineMeta(row.items);
  const guideline = normalizeExpenditureGuidelineMeta(meta ?? inline.meta, baseGuidelineFallback(row));

  return {
    id: Number(row.id),
    proposal_id: row.proposal_id == null ? null : Number(row.proposal_id),
    doc_number: String(row.doc_number ?? ""),
    project_name: projectName,
    expense_category: String(row.expense_category ?? ""),
    issue_date: String(row.issue_date ?? ""),
    record_date: String(row.record_date ?? ""),
    total_amount: Number(row.total_amount ?? 0),
    payee_address: String(row.payee_address ?? ""),
    payee_company: String(row.payee_company ?? ""),
    payee_name: String(row.payee_name ?? ""),
    receipt_date: String(row.receipt_date ?? ""),
    receipt_name: String(row.receipt_name ?? ""),
    items: inline.items,
    evidence_sheet: normalizeEvidenceAttachmentSheet(row.evidence_sheet, projectName),
    photo_sheet: normalizePhotoAttachmentSheet(row.photo_sheet, projectName),
    status: (row.status as Expenditure["status"]) ?? "draft",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    ...guideline,
  };
}

function toExpenditureRow(input: ExpenditureInput) {
  return {
    proposal_id: input.proposal_id,
    doc_number: input.doc_number,
    project_name: input.project_name,
    expense_category: input.expense_category,
    issue_date: input.issue_date || null,
    record_date: input.record_date || null,
    total_amount: input.total_amount,
    payee_address: input.payee_address,
    payee_company: input.payee_company,
    payee_name: input.payee_name,
    payment_method: paymentMethodLabel(input.payment_method),
    receipt_date: input.receipt_date || null,
    receipt_name: input.receipt_name,
    items: embedExpenditureInlineMeta(input.items, input),
    evidence_sheet: input.evidence_sheet,
    photo_sheet: input.photo_sheet,
    status: input.status,
  };
}

export async function listExpenditures() {
  if (!hasSupabaseEnv()) return listExpendituresMemory();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").order("id", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const metaMap = await fetchExpenditureGuidelineMetaMap(rows.map((row) => Number(row.id)));
  return rows.map((row) => normalizeExpenditure(row, metaMap.get(Number(row.id)) ?? null));
}

export async function getExpenditure(id: number) {
  if (!hasSupabaseEnv()) return getExpenditureMemory(id);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").eq("id", id).single();
  if (error) return null;

  const meta = await fetchExpenditureGuidelineMeta(id);
  return normalizeExpenditure(data, meta);
}

export async function createExpenditure(input: ExpenditureInput) {
  if (!hasSupabaseEnv()) return createExpenditureMemory(input);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").insert(toExpenditureRow(input)).select("*").single();
  if (error) throw error;

  const created = normalizeExpenditure(data, input);
  await upsertExpenditureGuidelineMeta(created.id, input);
  return created;
}

export async function updateExpenditure(id: number, input: ExpenditureInput) {
  if (!hasSupabaseEnv()) return updateExpenditureMemory(id, input);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("expenditures")
    .update({ ...toExpenditureRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;

  const updated = normalizeExpenditure(data, input);
  await upsertExpenditureGuidelineMeta(id, input);
  return updated;
}

export async function deleteExpenditure(id: number) {
  if (!hasSupabaseEnv()) {
    deleteExpenditureMemory(id);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("expenditures").delete().eq("id", id);
  if (error) throw error;
  await deleteExpenditureGuidelineMeta(id);
}

export async function batchExpenditures(ids: number[]) {
  if (!hasSupabaseEnv()) return batchExpenditureMemory(ids);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").in("id", ids).order("id");
  if (error) throw error;

  const rows = data ?? [];
  const metaMap = await fetchExpenditureGuidelineMetaMap(rows.map((row) => Number(row.id)));
  return rows.map((row) => normalizeExpenditure(row, metaMap.get(Number(row.id)) ?? null));
}
