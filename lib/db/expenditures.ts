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
import { resolveExpenditureAmount, withResolvedExpenditureAmount } from "@/lib/expenditure-amount";
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
  const totalAmount = resolveExpenditureAmount({
    total_amount: Number(row.total_amount ?? 0),
    eligible_amount: guideline.eligible_amount,
    supply_amount: guideline.supply_amount,
    vat_amount: guideline.vat_amount,
    items: inline.items,
  });

  return {
    id: Number(row.id),
    proposal_id: row.proposal_id == null ? null : Number(row.proposal_id),
    doc_number: String(row.doc_number ?? ""),
    project_name: projectName,
    expense_category: String(row.expense_category ?? ""),
    issue_date: String(row.issue_date ?? ""),
    record_date: String(row.record_date ?? ""),
    total_amount: totalAmount,
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
  const normalized = withResolvedExpenditureAmount(input);

  return {
    proposal_id: normalized.proposal_id,
    doc_number: normalized.doc_number,
    project_name: normalized.project_name,
    expense_category: normalized.expense_category,
    issue_date: normalized.issue_date || null,
    record_date: normalized.record_date || null,
    total_amount: normalized.total_amount,
    payee_address: normalized.payee_address,
    payee_company: normalized.payee_company,
    payee_name: normalized.payee_name,
    payment_method: paymentMethodLabel(normalized.payment_method),
    receipt_date: normalized.receipt_date || null,
    receipt_name: normalized.receipt_name,
    items: embedExpenditureInlineMeta(normalized.items, normalized),
    evidence_sheet: normalized.evidence_sheet,
    photo_sheet: normalized.photo_sheet,
    status: normalized.status,
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
  if (!hasSupabaseEnv()) return createExpenditureMemory(withResolvedExpenditureAmount(input));

  const supabase = getSupabaseAdmin();
  const normalizedInput = withResolvedExpenditureAmount(input);
  const { data, error } = await supabase.from("expenditures").insert(toExpenditureRow(normalizedInput)).select("*").single();
  if (error) throw error;

  const created = normalizeExpenditure(data, normalizedInput);
  await upsertExpenditureGuidelineMeta(created.id, normalizedInput);
  return created;
}

export async function updateExpenditure(id: number, input: ExpenditureInput) {
  if (!hasSupabaseEnv()) return updateExpenditureMemory(id, withResolvedExpenditureAmount(input));

  const supabase = getSupabaseAdmin();
  const normalizedInput = withResolvedExpenditureAmount(input);
  const { data, error } = await supabase
    .from("expenditures")
    .update({ ...toExpenditureRow(normalizedInput), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;

  const updated = normalizeExpenditure(data, normalizedInput);
  await upsertExpenditureGuidelineMeta(id, normalizedInput);
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
