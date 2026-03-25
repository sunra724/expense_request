import { today } from "@/lib/format";
import type {
  Expenditure,
  ExpenditureInput,
  Proposal,
  ProposalInput,
  StampSettings,
} from "@/lib/types";

let proposalId = 3;
let expenditureId = 3;

const now = () => new Date().toISOString();

let settings: StampSettings = {
  id: 1,
  staff_name: "담당자",
  manager_name: "실장",
  chairperson_name: "이사장",
  staff_stamp: "/stamps/staff.png",
  manager_stamp: "/stamps/manager.png",
  chairperson_stamp: "/stamps/chairperson.png",
  org_name: "협동조합 soilab",
  updated_at: now(),
};

let proposals: Proposal[] = [
  {
    id: 1,
    doc_number: "P-2026-001",
    fund_type: "grant",
    project_name: "청년도전지원사업 워크숍",
    project_period: "2026.04.02 ~ 2026.04.03",
    total_amount: 950000,
    related_plan: "사업 운영 계획서 1부. 끝.",
    org_name: "협동조합 soilab",
    submission_date: today(),
    items: [
      {
        expense_category: "진행비",
        description: "워크숍 현수막 및 진행물",
        estimated_amount: 250000,
        calculation_basis: "250,000원 x 1식",
        note: "",
      },
      {
        expense_category: "식대",
        description: "참여자 식사",
        estimated_amount: 700000,
        calculation_basis: "14,000원 x 50명",
        note: "",
      },
    ],
    status: "draft",
    created_at: now(),
    updated_at: now(),
  },
];

let expenditures: Expenditure[] = [
  {
    id: 1,
    proposal_id: 1,
    doc_number: "E-2026-001",
    project_name: "청년도전지원사업 워크숍",
    expense_category: "운영비",
    issue_date: today(),
    record_date: today(),
    total_amount: 480000,
    payee_address: "서울시 마포구",
    payee_company: "soilab 협력사",
    payee_name: "홍길동",
    payment_method: "계좌이체",
    receipt_date: today(),
    receipt_name: "간이영수증",
    items: [
      { description: "진행물 제작", amount: 180000, note: "" },
      { description: "회의 다과", amount: 300000, note: "" },
    ],
    status: "finalized",
    created_at: now(),
    updated_at: now(),
  },
];

export function listProposalsMemory() {
  return proposals.slice().sort((a, b) => b.id - a.id);
}

export function getProposalMemory(id: number) {
  return proposals.find((proposal) => proposal.id === id) ?? null;
}

export function createProposalMemory(input: ProposalInput) {
  const created: Proposal = { ...input, id: proposalId++, created_at: now(), updated_at: now() };
  proposals = [created, ...proposals];
  return created;
}

export function updateProposalMemory(id: number, input: ProposalInput) {
  const current = getProposalMemory(id);
  if (!current) return null;
  const updated: Proposal = { ...current, ...input, id, updated_at: now() };
  proposals = proposals.map((proposal) => (proposal.id === id ? updated : proposal));
  return updated;
}

export function deleteProposalMemory(id: number) {
  proposals = proposals.filter((proposal) => proposal.id !== id);
  expenditures = expenditures.map((item) =>
    item.proposal_id === id ? { ...item, proposal_id: null, updated_at: now() } : item,
  );
}

export function batchProposalMemory(ids: number[]) {
  return proposals.filter((proposal) => ids.includes(proposal.id));
}

export function listExpendituresMemory() {
  return expenditures.slice().sort((a, b) => b.id - a.id);
}

export function getExpenditureMemory(id: number) {
  return expenditures.find((item) => item.id === id) ?? null;
}

export function createExpenditureMemory(input: ExpenditureInput) {
  const created: Expenditure = { ...input, id: expenditureId++, created_at: now(), updated_at: now() };
  expenditures = [created, ...expenditures];
  return created;
}

export function updateExpenditureMemory(id: number, input: ExpenditureInput) {
  const current = getExpenditureMemory(id);
  if (!current) return null;
  const updated: Expenditure = { ...current, ...input, id, updated_at: now() };
  expenditures = expenditures.map((item) => (item.id === id ? updated : item));
  return updated;
}

export function deleteExpenditureMemory(id: number) {
  expenditures = expenditures.filter((item) => item.id !== id);
}

export function batchExpenditureMemory(ids: number[]) {
  return expenditures.filter((item) => ids.includes(item.id));
}

export function getSettingsMemory() {
  return settings;
}

export function updateSettingsMemory(input: Partial<StampSettings>) {
  settings = { ...settings, ...input, updated_at: now() };
  return settings;
}
