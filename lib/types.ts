import type {
  BudgetScope,
  EvidenceChecklistKey,
  ManagedEvidenceType,
  ManagedPaymentMethod,
} from "@/lib/guideline";

export type DocumentStatus = "draft" | "finalized";
export type FundType = "grant" | "self" | "both";
export type EvidenceDocumentType =
  | "card_slip"
  | "tax_invoice"
  | "cash_receipt"
  | "receipt"
  | "transaction_statement"
  | "other";

export type ProposalItem = {
  expense_category: string;
  description: string;
  estimated_amount: number;
  calculation_basis: string;
  note: string;
};

export type ExpenditureItem = {
  description: string;
  amount: number;
  note: string;
};

export type EvidenceAttachmentItem = {
  id: string;
  evidence_type: EvidenceDocumentType;
  title: string;
  issuer: string;
  issued_on: string;
  amount: number;
  related_item: string;
  file_note: string;
  note: string;
  attachment_name: string;
  attachment_data_url: string;
  attachment_mime_type: string;
};

export type EvidenceAttachmentSheet = {
  title: string;
  submission_note: string;
  items: EvidenceAttachmentItem[];
};

export type PhotoAttachmentItem = {
  id: string;
  title: string;
  shot_date: string;
  location: string;
  description: string;
  related_item: string;
  file_note: string;
  note: string;
  images: {
    name: string;
    data_url: string;
  }[];
};

export type PhotoAttachmentSheet = {
  title: string;
  submission_note: string;
  items: PhotoAttachmentItem[];
};

export type Organization = {
  id: number;
  slug: string;
  name: string;
  business_account_note: string;
  direct_cost_account_note: string;
  indirect_cost_account_note: string;
  default_template_code: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  starts_on: string;
  ends_on: string;
  guideline_code: string;
  direct_budget_total: number;
  indirect_budget_total: number;
  created_at: string;
  updated_at: string;
};

export type ProposalGuidelineFields = {
  organization_id: number | null;
  project_id: number | null;
  template_code: string;
  budget_scope: BudgetScope;
  budget_category: string;
  budget_item: string;
  planned_payment_date: string;
  payment_method: ManagedPaymentMethod;
  vendor_name: string;
  vendor_business_number: string;
  supply_amount: number;
  vat_amount: number;
  eligible_amount: number;
  evidence_checklist: EvidenceChecklistKey[];
  transfer_note: string;
  requires_foundation_approval: boolean;
  compliance_flags: string[];
};

export type ExpenditureGuidelineFields = {
  organization_id: number | null;
  project_id: number | null;
  template_code: string;
  budget_scope: BudgetScope;
  budget_category: string;
  budget_item: string;
  payment_method: ManagedPaymentMethod;
  vendor_business_number: string;
  evidence_type: ManagedEvidenceType;
  supply_amount: number;
  vat_amount: number;
  eligible_amount: number;
  attendee_count: number;
  unit_amount: number;
  evidence_checklist: EvidenceChecklistKey[];
  evidence_completion: Partial<Record<EvidenceChecklistKey, boolean>>;
  compliance_flags: string[];
  vat_excluded: boolean;
};

export type Proposal = ProposalGuidelineFields & {
  id: number;
  doc_number: string;
  fund_type: FundType;
  project_name: string;
  project_period: string;
  total_amount: number;
  related_plan: string;
  org_name: string;
  submission_date: string;
  items: ProposalItem[];
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type Expenditure = ExpenditureGuidelineFields & {
  id: number;
  proposal_id: number | null;
  doc_number: string;
  project_name: string;
  expense_category: string;
  issue_date: string;
  record_date: string;
  total_amount: number;
  payee_address: string;
  payee_company: string;
  payee_name: string;
  receipt_date: string;
  receipt_name: string;
  items: ExpenditureItem[];
  evidence_sheet: EvidenceAttachmentSheet;
  photo_sheet: PhotoAttachmentSheet;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type StampSettings = {
  id: number;
  staff_name: string;
  manager_name: string;
  chairperson_name: string;
  staff_stamp: string;
  manager_stamp: string;
  chairperson_stamp: string;
  org_name: string;
  updated_at: string;
};

export type ProposalInput = Omit<Proposal, "id" | "created_at" | "updated_at">;
export type ExpenditureInput = Omit<Expenditure, "id" | "created_at" | "updated_at">;
