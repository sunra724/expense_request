import { today } from "@/lib/format";
import { defaultEvidenceChecklist } from "@/lib/guideline";
import type {
  ExpenditureGuidelineFields,
  Organization,
  Project,
  ProposalGuidelineFields,
} from "@/lib/types";

export function createDefaultProposalGuidelineFields(
  organization?: Organization | null,
  project?: Project | null,
): ProposalGuidelineFields {
  return {
    organization_id: organization?.id ?? project?.organization_id ?? null,
    project_id: project?.id ?? null,
    template_code: organization?.default_template_code ?? "default",
    budget_scope: "direct",
    budget_category: "",
    budget_item: "",
    planned_payment_date: today(),
    payment_method: "account_transfer",
    vendor_name: "",
    vendor_business_number: "",
    supply_amount: 0,
    vat_amount: 0,
    eligible_amount: 0,
    evidence_checklist: defaultEvidenceChecklist("account_transfer"),
    transfer_note: "",
    requires_foundation_approval: false,
    compliance_flags: [],
  };
}

export function createDefaultExpenditureGuidelineFields(
  organization?: Organization | null,
  project?: Project | null,
): ExpenditureGuidelineFields {
  return {
    organization_id: organization?.id ?? project?.organization_id ?? null,
    project_id: project?.id ?? null,
    template_code: organization?.default_template_code ?? "default",
    budget_scope: "direct",
    budget_category: "",
    budget_item: "",
    payment_method: "account_transfer",
    vendor_business_number: "",
    evidence_type: "card_payment",
    supply_amount: 0,
    vat_amount: 0,
    eligible_amount: 0,
    attendee_count: 0,
    unit_amount: 0,
    evidence_checklist: defaultEvidenceChecklist("account_transfer"),
    evidence_completion: {},
    compliance_flags: [],
    vat_excluded: false,
  };
}
