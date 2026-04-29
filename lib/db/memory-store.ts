import {
  createEvidenceAttachmentSheet,
  createPhotoAttachmentSheet,
} from "@/lib/attachment-sheets";
import {
  createDefaultExpenditureGuidelineFields,
  createDefaultProposalGuidelineFields,
} from "@/lib/document-defaults";
import { today } from "@/lib/format";
import { defaultEvidenceChecklist } from "@/lib/guideline";
import type {
  Expenditure,
  ExpenditureInput,
  Organization,
  Project,
  Proposal,
  ProposalInput,
  StampSettings,
} from "@/lib/types";

let organizationId = 3;
let projectId = 2;
let proposalId = 3;
let expenditureId = 3;

const now = () => new Date().toISOString();

let organizations: Organization[] = [
  {
    id: 1,
    slug: "youth-foundation",
    name: "청년재단",
    business_account_note: "지원기관 기준 사업비 관리",
    direct_cost_account_note: "직접비 계정 확인",
    indirect_cost_account_note: "간접비 계정 확인",
    default_template_code: "default",
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 2,
    slug: "soilab",
    name: "협동조합 소이랩",
    business_account_note: "운영기관 내부 회계 참고용",
    direct_cost_account_note: "직접비 계좌 별도 관리",
    indirect_cost_account_note: "간접비 계좌 별도 관리",
    default_template_code: "default",
    created_at: now(),
    updated_at: now(),
  },
];

let projects: Project[] = [
  {
    id: 1,
    organization_id: 1,
    code: "dadareum-2026",
    name: "2026년 청년 다다름 사업",
    starts_on: "2026-01-01",
    ends_on: "2026-12-31",
    guideline_code: "youth-dadareum-2026",
    direct_budget_total: 48000000,
    indirect_budget_total: 31500000,
    created_at: now(),
    updated_at: now(),
  },
];

let settings: StampSettings = {
  id: 1,
  staff_name: "이형구",
  manager_name: "부장",
  chairperson_name: "강아름",
  staff_stamp: "/stamps/lee-hyunggu.png",
  manager_stamp: "/stamps/manager.png",
  chairperson_stamp: "/stamps/kang-areum.png",
  org_name: "협동조합 소이랩",
  updated_at: now(),
};

let proposals: Proposal[] = [
  {
    id: 1,
    doc_number: "다다름-직접-품의-26-001",
    fund_type: "grant",
    project_name: "2026년 청년 다다름 사업",
    project_period: "2026-01-01 ~ 2026-12-31",
    total_amount: 950000,
    related_plan: "사업 운영 계획서 1부",
    org_name: "협동조합 소이랩",
    submission_date: today(),
    items: [
      {
        expense_category: "프로그램 운영비",
        description: "워크숍 장소 대관 및 진행비",
        estimated_amount: 250000,
        calculation_basis: "250,000원 x 1회",
        note: "",
      },
      {
        expense_category: "참여자 식비",
        description: "참여자 행사 식사",
        estimated_amount: 700000,
        calculation_basis: "14,000원 x 50명",
        note: "",
      },
    ],
    status: "draft",
    ...createDefaultProposalGuidelineFields(organizations[0], projects[0]),
    budget_category: "직접사업비",
    budget_item: "프로그램 운영",
    planned_payment_date: today(),
    vendor_name: "soilab 파트너스",
    supply_amount: 950000,
    eligible_amount: 950000,
    evidence_checklist: defaultEvidenceChecklist("account_transfer"),
    created_at: now(),
    updated_at: now(),
  },
];

let expenditures: Expenditure[] = [
  {
    id: 1,
    proposal_id: 1,
    doc_number: "다다름-직접-결의-26-001",
    project_name: "2026년 청년 다다름 사업",
    expense_category: "운영비",
    issue_date: today(),
    record_date: today(),
    total_amount: 480000,
    payee_address: "서울시 마포구",
    payee_company: "soilab 협력사",
    payee_name: "홍길동",
    receipt_date: today(),
    receipt_name: "간이영수증",
    items: [
      { description: "진행비 일부", amount: 180000, note: "" },
      { description: "회의 식비", amount: 300000, note: "" },
    ],
    evidence_sheet: {
      title: "2026년 청년 다다름 사업 증빙서류 첨부지",
      submission_note: "카드전표와 간이영수증을 함께 보관합니다.",
      items: [
        {
          id: "evidence-demo-1",
          evidence_type: "card_slip",
          title: "회의 식비 카드전표",
          issuer: "soilab 협력사",
          issued_on: today(),
          amount: 300000,
          related_item: "회의 식비",
          file_note: "원본 별도 보관",
          note: "",
          attachment_name: "",
          attachment_data_url: "",
          attachment_mime_type: "",
        },
      ],
    },
    photo_sheet: {
      title: "2026년 청년 다다름 사업 증빙사진 첨부지",
      submission_note: "행사 진행 사진을 순서대로 첨부합니다.",
      items: [
        {
          id: "photo-demo-1",
          title: "워크숍 현장",
          shot_date: today(),
          location: "서울시 마포구",
          description: "프로그램 시작 전 참여자 착석 모습",
          related_item: "행사 운영",
          file_note: "사진 파일 별도 보관",
          note: "",
          images: [],
        },
      ],
    },
    status: "finalized",
    ...createDefaultExpenditureGuidelineFields(organizations[0], projects[0]),
    budget_category: "직접사업비",
    budget_item: "프로그램 운영",
    payment_method: "account_transfer",
    vendor_business_number: "123-45-67890",
    evidence_type: "card_payment",
    supply_amount: 480000,
    eligible_amount: 480000,
    evidence_checklist: defaultEvidenceChecklist("account_transfer"),
    evidence_completion: {
      proposal_document: true,
      vendor_registration: true,
      vendor_bankbook: true,
      tax_invoice: true,
      transaction_statement: true,
    },
    created_at: now(),
    updated_at: now(),
  },
];

export function listOrganizationsMemory() {
  return organizations.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function getOrganizationMemory(id: number) {
  return organizations.find((organization) => organization.id === id) ?? null;
}

export function createOrganizationMemory(
  input: Omit<Organization, "id" | "created_at" | "updated_at">,
) {
  const created: Organization = { ...input, id: organizationId++, created_at: now(), updated_at: now() };
  organizations = [...organizations, created];
  return created;
}

export function listProjectsMemory(organizationIdFilter?: number | null) {
  return projects
    .filter((project) => (organizationIdFilter ? project.organization_id === organizationIdFilter : true))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function getProjectMemory(id: number) {
  return projects.find((project) => project.id === id) ?? null;
}

export function createProjectMemory(input: Omit<Project, "id" | "created_at" | "updated_at">) {
  const created: Project = { ...input, id: projectId++, created_at: now(), updated_at: now() };
  projects = [...projects, created];
  return created;
}

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
  const created: Expenditure = {
    ...input,
    evidence_sheet: input.evidence_sheet ?? createEvidenceAttachmentSheet(input.project_name),
    photo_sheet: input.photo_sheet ?? createPhotoAttachmentSheet(input.project_name),
    id: expenditureId++,
    created_at: now(),
    updated_at: now(),
  };
  expenditures = [created, ...expenditures];
  return created;
}

export function updateExpenditureMemory(id: number, input: ExpenditureInput) {
  const current = getExpenditureMemory(id);
  if (!current) return null;
  const updated: Expenditure = {
    ...current,
    ...input,
    evidence_sheet: input.evidence_sheet ?? current.evidence_sheet,
    photo_sheet: input.photo_sheet ?? current.photo_sheet,
    id,
    updated_at: now(),
  };
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
