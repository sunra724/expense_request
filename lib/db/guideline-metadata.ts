import { createDefaultExpenditureGuidelineFields, createDefaultProposalGuidelineFields } from "@/lib/document-defaults";
import { normalizeEvidenceType, normalizePaymentMethod } from "@/lib/guideline";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ExpenditureGuidelineFields,
  ExpenditureInput,
  ProposalGuidelineFields,
  ProposalInput,
} from "@/lib/types";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function asNullableNumber(value: unknown) {
  return value == null || value === "" ? null : asNumber(value);
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function asChecklist<T extends string>(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is T => typeof entry === "string") : [];
}

function asChecklistCompletion(value: unknown) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter(([, checked]) => typeof checked === "boolean"),
  ) as ExpenditureGuidelineFields["evidence_completion"];
}

export function normalizeProposalGuidelineMeta(
  value: unknown,
  fallback: ProposalGuidelineFields = createDefaultProposalGuidelineFields(),
): ProposalGuidelineFields {
  const record = asRecord(value);

  return {
    ...fallback,
    organization_id: asNullableNumber(record.organization_id) ?? fallback.organization_id,
    project_id: asNullableNumber(record.project_id) ?? fallback.project_id,
    template_code: asText(record.template_code) || fallback.template_code,
    budget_scope: record.budget_scope === "indirect" ? "indirect" : fallback.budget_scope,
    budget_category: asText(record.budget_category) || fallback.budget_category,
    budget_item: asText(record.budget_item) || fallback.budget_item,
    planned_payment_date: asText(record.planned_payment_date) || fallback.planned_payment_date,
    payment_method: normalizePaymentMethod(record.payment_method ?? fallback.payment_method),
    vendor_name: asText(record.vendor_name) || fallback.vendor_name,
    vendor_business_number: asText(record.vendor_business_number) || fallback.vendor_business_number,
    supply_amount: asNumber(record.supply_amount ?? fallback.supply_amount),
    vat_amount: asNumber(record.vat_amount ?? fallback.vat_amount),
    eligible_amount: asNumber(record.eligible_amount ?? fallback.eligible_amount),
    evidence_checklist: asChecklist<ProposalGuidelineFields["evidence_checklist"][number]>(record.evidence_checklist),
    transfer_note: asText(record.transfer_note) || fallback.transfer_note,
    requires_foundation_approval: asBoolean(
      record.requires_foundation_approval ?? fallback.requires_foundation_approval,
    ),
    compliance_flags: asChecklist<ProposalGuidelineFields["compliance_flags"][number]>(record.compliance_flags),
  };
}

export function normalizeExpenditureGuidelineMeta(
  value: unknown,
  fallback: ExpenditureGuidelineFields = createDefaultExpenditureGuidelineFields(),
): ExpenditureGuidelineFields {
  const record = asRecord(value);

  return {
    ...fallback,
    organization_id: asNullableNumber(record.organization_id) ?? fallback.organization_id,
    project_id: asNullableNumber(record.project_id) ?? fallback.project_id,
    template_code: asText(record.template_code) || fallback.template_code,
    budget_scope: record.budget_scope === "indirect" ? "indirect" : fallback.budget_scope,
    budget_category: asText(record.budget_category) || fallback.budget_category,
    budget_item: asText(record.budget_item) || fallback.budget_item,
    payment_method: normalizePaymentMethod(record.payment_method ?? fallback.payment_method),
    vendor_business_number: asText(record.vendor_business_number) || fallback.vendor_business_number,
    evidence_type: normalizeEvidenceType(record.evidence_type ?? fallback.evidence_type),
    supply_amount: asNumber(record.supply_amount ?? fallback.supply_amount),
    vat_amount: asNumber(record.vat_amount ?? fallback.vat_amount),
    eligible_amount: asNumber(record.eligible_amount ?? fallback.eligible_amount),
    attendee_count: asNumber(record.attendee_count ?? fallback.attendee_count),
    unit_amount: asNumber(record.unit_amount ?? fallback.unit_amount),
    evidence_checklist: asChecklist<ExpenditureGuidelineFields["evidence_checklist"][number]>(record.evidence_checklist),
    evidence_completion: asChecklistCompletion(record.evidence_completion),
    compliance_flags: asChecklist<ExpenditureGuidelineFields["compliance_flags"][number]>(record.compliance_flags),
    vat_excluded: asBoolean(record.vat_excluded ?? fallback.vat_excluded),
  };
}

export async function fetchProposalGuidelineMetaMap(ids: number[]) {
  if (!ids.length) return new Map<number, ProposalGuidelineFields>();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("proposal_guideline_meta").select("*").in("proposal_id", ids);
    if (error) throw error;

    return new Map(
      (data ?? []).map((row) => [Number(row.proposal_id), normalizeProposalGuidelineMeta(row)]),
    );
  } catch {
    return new Map<number, ProposalGuidelineFields>();
  }
}

export async function fetchProposalGuidelineMeta(id: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("proposal_guideline_meta")
      .select("*")
      .eq("proposal_id", id)
      .single();
    if (error) return null;
    return normalizeProposalGuidelineMeta(data);
  } catch {
    return null;
  }
}

export async function upsertProposalGuidelineMeta(proposalId: number, input: ProposalInput) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("proposal_guideline_meta").upsert(
      {
        proposal_id: proposalId,
        organization_id: input.organization_id,
        project_id: input.project_id,
        template_code: input.template_code,
        budget_scope: input.budget_scope,
        budget_category: input.budget_category,
        budget_item: input.budget_item,
        planned_payment_date: input.planned_payment_date || null,
        payment_method: input.payment_method,
        vendor_name: input.vendor_name,
        vendor_business_number: input.vendor_business_number,
        supply_amount: input.supply_amount,
        vat_amount: input.vat_amount,
        eligible_amount: input.eligible_amount,
        evidence_checklist: input.evidence_checklist,
        transfer_note: input.transfer_note,
        requires_foundation_approval: input.requires_foundation_approval,
        compliance_flags: input.compliance_flags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "proposal_id" },
    );
  } catch {
    // Ignore metadata persistence failures until the new tables are applied.
  }
}

export async function deleteProposalGuidelineMeta(id: number) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("proposal_guideline_meta").delete().eq("proposal_id", id);
  } catch {
    // Ignore metadata deletion failures.
  }
}

export async function fetchExpenditureGuidelineMetaMap(ids: number[]) {
  if (!ids.length) return new Map<number, ExpenditureGuidelineFields>();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("expenditure_guideline_meta")
      .select("*")
      .in("expenditure_id", ids);
    if (error) throw error;

    return new Map(
      (data ?? []).map((row) => [Number(row.expenditure_id), normalizeExpenditureGuidelineMeta(row)]),
    );
  } catch {
    return new Map<number, ExpenditureGuidelineFields>();
  }
}

export async function fetchExpenditureGuidelineMeta(id: number) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("expenditure_guideline_meta")
      .select("*")
      .eq("expenditure_id", id)
      .single();
    if (error) return null;
    return normalizeExpenditureGuidelineMeta(data);
  } catch {
    return null;
  }
}

export async function upsertExpenditureGuidelineMeta(expenditureId: number, input: ExpenditureInput) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("expenditure_guideline_meta").upsert(
      {
        expenditure_id: expenditureId,
        organization_id: input.organization_id,
        project_id: input.project_id,
        template_code: input.template_code,
        budget_scope: input.budget_scope,
        budget_category: input.budget_category,
        budget_item: input.budget_item,
        payment_method: input.payment_method,
        vendor_business_number: input.vendor_business_number,
        evidence_type: input.evidence_type,
        supply_amount: input.supply_amount,
        vat_amount: input.vat_amount,
        eligible_amount: input.eligible_amount,
        attendee_count: input.attendee_count,
        unit_amount: input.unit_amount,
        evidence_checklist: input.evidence_checklist,
        evidence_completion: input.evidence_completion,
        compliance_flags: input.compliance_flags,
        vat_excluded: input.vat_excluded,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "expenditure_id" },
    );
  } catch {
    // Ignore metadata persistence failures until the new tables are applied.
  }
}

export async function deleteExpenditureGuidelineMeta(id: number) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("expenditure_guideline_meta").delete().eq("expenditure_id", id);
  } catch {
    // Ignore metadata deletion failures.
  }
}
