import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type { Expenditure, ExpenditureInput } from "@/lib/types";
import {
  batchExpenditureMemory,
  createExpenditureMemory,
  deleteExpenditureMemory,
  getExpenditureMemory,
  listExpendituresMemory,
  updateExpenditureMemory,
} from "@/lib/db/memory-store";

function normalizeExpenditure(row: Record<string, unknown>): Expenditure {
  return {
    id: Number(row.id),
    proposal_id: row.proposal_id == null ? null : Number(row.proposal_id),
    doc_number: String(row.doc_number ?? ""),
    project_name: String(row.project_name ?? ""),
    expense_category: String(row.expense_category ?? ""),
    issue_date: String(row.issue_date ?? ""),
    record_date: String(row.record_date ?? ""),
    total_amount: Number(row.total_amount ?? 0),
    payee_address: String(row.payee_address ?? ""),
    payee_company: String(row.payee_company ?? ""),
    payee_name: String(row.payee_name ?? ""),
    payment_method: String(row.payment_method ?? ""),
    receipt_date: String(row.receipt_date ?? ""),
    receipt_name: String(row.receipt_name ?? ""),
    items: Array.isArray(row.items) ? (row.items as Expenditure["items"]) : [],
    status: (row.status as Expenditure["status"]) ?? "draft",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listExpenditures() {
  if (!hasSupabaseEnv()) return listExpendituresMemory();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeExpenditure(row));
}

export async function getExpenditure(id: number) {
  if (!hasSupabaseEnv()) return getExpenditureMemory(id);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").eq("id", id).single();
  if (error) return null;
  return normalizeExpenditure(data);
}

export async function createExpenditure(input: ExpenditureInput) {
  if (!hasSupabaseEnv()) return createExpenditureMemory(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").insert(input).select("*").single();
  if (error) throw error;
  return normalizeExpenditure(data);
}

export async function updateExpenditure(id: number, input: ExpenditureInput) {
  if (!hasSupabaseEnv()) return updateExpenditureMemory(id, input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("expenditures")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  return normalizeExpenditure(data);
}

export async function deleteExpenditure(id: number) {
  if (!hasSupabaseEnv()) {
    deleteExpenditureMemory(id);
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("expenditures").delete().eq("id", id);
  if (error) throw error;
}

export async function batchExpenditures(ids: number[]) {
  if (!hasSupabaseEnv()) return batchExpenditureMemory(ids);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("expenditures").select("*").in("id", ids).order("id");
  if (error) throw error;
  return (data ?? []).map((row) => normalizeExpenditure(row));
}
