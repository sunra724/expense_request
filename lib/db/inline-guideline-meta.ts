import type {
  ExpenditureGuidelineFields,
  ExpenditureInput,
  ExpenditureItem,
  ProposalGuidelineFields,
  ProposalInput,
  ProposalItem,
} from "@/lib/types";

const PROPOSAL_META_KIND = "__proposal_guideline_meta_v1";
const EXPENDITURE_META_KIND = "__expenditure_guideline_meta_v1";

type InlineMetaEnvelope = {
  __kind: string;
  value: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInlineMetaEnvelope(value: unknown, kind: string): value is InlineMetaEnvelope {
  return isRecord(value) && value.__kind === kind && "value" in value;
}

function isProposalItem(value: unknown): value is ProposalItem {
  return isRecord(value) && !("__kind" in value);
}

function isExpenditureItem(value: unknown): value is ExpenditureItem {
  return isRecord(value) && !("__kind" in value);
}

function pickProposalGuidelineFields(input: ProposalInput): ProposalGuidelineFields {
  return {
    organization_id: input.organization_id,
    project_id: input.project_id,
    template_code: input.template_code,
    budget_scope: input.budget_scope,
    budget_category: input.budget_category,
    budget_item: input.budget_item,
    planned_payment_date: input.planned_payment_date,
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
  };
}

function pickExpenditureGuidelineFields(input: ExpenditureInput): ExpenditureGuidelineFields {
  return {
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
  };
}

export function embedProposalInlineMeta(items: ProposalItem[], input: ProposalInput) {
  return [
    ...items,
    {
      __kind: PROPOSAL_META_KIND,
      value: pickProposalGuidelineFields(input),
    },
  ];
}

export function extractProposalInlineMeta(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  let meta: unknown | null = null;

  const visibleItems = items.filter((item) => {
    if (isInlineMetaEnvelope(item, PROPOSAL_META_KIND)) {
      meta = item.value;
      return false;
    }
    return isProposalItem(item);
  }) as ProposalItem[];

  return { items: visibleItems, meta };
}

export function embedExpenditureInlineMeta(items: ExpenditureItem[], input: ExpenditureInput) {
  return [
    ...items,
    {
      __kind: EXPENDITURE_META_KIND,
      value: pickExpenditureGuidelineFields(input),
    },
  ];
}

export function extractExpenditureInlineMeta(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  let meta: unknown | null = null;

  const visibleItems = items.filter((item) => {
    if (isInlineMetaEnvelope(item, EXPENDITURE_META_KIND)) {
      meta = item.value;
      return false;
    }
    return isExpenditureItem(item);
  }) as ExpenditureItem[];

  return { items: visibleItems, meta };
}
