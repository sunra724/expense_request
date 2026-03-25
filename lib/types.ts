export type DocumentStatus = "draft" | "finalized";
export type FundType = "grant" | "self" | "both";

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

export type Proposal = {
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

export type Expenditure = {
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
  payment_method: string;
  receipt_date: string;
  receipt_name: string;
  items: ExpenditureItem[];
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
