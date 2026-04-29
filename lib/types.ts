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

export type DadareumProjectSettings = {
  project_id: number;
  operating_year: number;
  funding_agency: string;
  settlement_form_code: string;
  agreed_budget_total: number;
  revised_budget_total: number;
  execution_budget_total: number;
  direct_budget_total: number;
  indirect_budget_total: number;
  per_youth_main_limit: number;
  per_youth_relief_limit: number;
  max_youth_count: number;
  promotion_ratio_limit: number;
  business_promotion_ratio_limit: number;
  settlement_started_on: string;
  settlement_closed_on: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type BudgetCategory = {
  id: number;
  guideline_code: string;
  code: string;
  name: string;
  budget_scope: BudgetScope;
  level: 1 | 2 | 3;
  parent_id: number | null;
  requires_youth_allocation: boolean;
  reimbursable_to_youth: boolean;
  unit_limit_amount: number | null;
  unit_limit_basis: string;
  ratio_rule_key: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectBudgetLine = {
  id: number;
  project_id: number;
  budget_category_id: number;
  agreed_amount: number;
  revised_amount: number;
  execution_budget_amount: number;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectBudgetLineInput = {
  budget_category_id: number;
  agreed_amount: number;
  revised_amount: number;
  execution_budget_amount: number;
  notes: string;
  sort_order: number;
};

export type ProjectBudgetSetup = {
  project: Project | null;
  settings: DadareumProjectSettings;
  categories: BudgetCategory[];
  lines: ProjectBudgetLine[];
};

export type ProjectYouth = {
  id: number;
  project_id: number;
  serial_no: number;
  display_name: string;
  enrolled_on: string;
  withdrawn_on: string;
  withdrawal_reason: string;
  status: "active" | "withdrawn" | "completed";
  notes: string;
  deleted_at: string;
  created_at: string;
  updated_at: string;
};

export type ProjectYouthInput = {
  project_id: number;
  serial_no: number;
  display_name: string;
  enrolled_on: string;
  withdrawn_on: string;
  withdrawal_reason: string;
  status: ProjectYouth["status"];
  notes: string;
};

export type ExpenditureYouthAllocation = {
  id: number;
  expenditure_id: number;
  youth_id: number;
  allocation_kind: "main" | "relief";
  allocated_amount: number;
  allocation_note: string;
  created_at: string;
  updated_at: string;
};

export type ExpenditureYouthAllocationInput = {
  youth_id: number;
  allocation_kind: ExpenditureYouthAllocation["allocation_kind"];
  allocated_amount: number;
  allocation_note: string;
};

export type DadareumDashboardBudgetRow = {
  key: string;
  scope: BudgetScope;
  categoryName: string;
  itemName: string;
  budgetAmount: number;
  executedAmount: number;
  remainingAmount: number;
  executionRate: number;
  documentCount: number;
};

export type DadareumDashboardYouthRow = {
  youthId: number | null;
  serialNo: number | null;
  name: string;
  status: ProjectYouth["status"] | "unassigned";
  mainUsed: number;
  mainRemaining: number;
  reliefUsed: number;
  reliefRemaining: number;
  documentCount: number;
};

export type DadareumDashboardAlert = {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "blocking";
  href?: string;
};

export type DadareumDashboard = {
  project: Project | null;
  settings: DadareumProjectSettings;
  generatedAt: string;
  totals: {
    budgetTotal: number;
    directBudgetTotal: number;
    indirectBudgetTotal: number;
    executedTotal: number;
    directExecutedTotal: number;
    indirectExecutedTotal: number;
    draftPlannedTotal: number;
    proposalTotal: number;
    evidencePendingCount: number;
    approvalPendingCount: number;
    disallowedTotal: number;
  };
  budgetRows: DadareumDashboardBudgetRow[];
  youthRows: DadareumDashboardYouthRow[];
  alerts: DadareumDashboardAlert[];
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
