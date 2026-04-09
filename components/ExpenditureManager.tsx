"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import {
  getAmountFieldLabels,
  getAmountPresentationMode,
  mergeWithholdingAmount,
} from "@/lib/amount-presentation";
import CurrencyInput from "@/components/CurrencyInput";
import EvidenceChecklistSelector from "@/components/EvidenceChecklistSelector";
import {
  countFilledEvidenceItems,
  countFilledPhotoItems,
  createEvidenceAttachmentSheet,
  createPhotoAttachmentSheet,
} from "@/lib/attachment-sheets";
import { createDefaultExpenditureGuidelineFields } from "@/lib/document-defaults";
import { applyDocumentPrefix, hasDocumentNumberSuffix } from "@/lib/document-number";
import { formatCurrency, mergeEligibleAmount, splitVatFromTotal, today } from "@/lib/format";
import {
  buildEvidenceChecklist,
  budgetScopeLabel,
  budgetScopeOptions,
  evidenceChecklistLabel,
  evidenceTypeLabel,
  evidenceTypeOptions,
  paymentMethodLabel,
  paymentMethodOptions,
  requiresRecipientIdentityCopy,
} from "@/lib/guideline";
import type { Expenditure, ExpenditureInput, ExpenditureItem, Organization, Project, Proposal } from "@/lib/types";

type ContextPayload = { organizations: Organization[]; projects: Project[] };
const emptyItem = (): ExpenditureItem => ({ description: "", amount: 0, note: "" });

function mapProposalItemsToExpenditureItems(proposal: Proposal): ExpenditureItem[] {
  if (!proposal.items.length) return [emptyItem()];

  return proposal.items.map((item) => ({
    description: item.description,
    amount: item.estimated_amount,
    note: [item.calculation_basis ? `산출근거: ${item.calculation_basis}` : "", item.note]
      .filter(Boolean)
      .join(" / "),
  }));
}

function buildChecklistCompletion(
  checklist: ExpenditureInput["evidence_checklist"],
  currentCompletion: ExpenditureInput["evidence_completion"] = {},
) {
  return Object.fromEntries(
    Object.entries(currentCompletion).filter(([key]) =>
      checklist.includes(key as ExpenditureInput["evidence_checklist"][number]),
    ),
  ) as ExpenditureInput["evidence_completion"];
}

function applyProposalToExpenditureForm(
  proposal: Proposal,
  current?: ExpenditureInput | null,
): ExpenditureInput {
  const items = mapProposalItemsToExpenditureItems(proposal);
  const checklist = proposal.evidence_checklist.length
    ? [...proposal.evidence_checklist]
    : buildEvidenceChecklist(proposal.payment_method, {
        budgetItem: proposal.budget_item,
        expenseCategory: proposal.items.map((item) => item.expense_category).join(" "),
        vendorBusinessNumber: proposal.vendor_business_number,
        vendorName: proposal.vendor_name,
      });

  return {
    ...(current ?? createDefaultExpenditureGuidelineFields()),
    proposal_id: proposal.id,
    doc_number:
      current?.doc_number && current.proposal_id === proposal.id
        ? current.doc_number
        : applyDocumentPrefix("", "expenditure", proposal.budget_scope, current?.issue_date || today()),
    project_name: proposal.project_name,
    expense_category: proposal.items[0]?.expense_category ?? proposal.budget_item ?? "",
    issue_date: current?.issue_date || today(),
    record_date: current?.record_date || today(),
    total_amount: proposal.total_amount,
    payee_address: current?.payee_address || "",
    payee_company: proposal.vendor_name,
    payee_name:
      current?.payee_name || (!proposal.vendor_business_number ? proposal.vendor_name : ""),
    receipt_date: current?.receipt_date || today(),
    receipt_name: current?.receipt_name || proposal.vendor_name || "",
    items,
    evidence_sheet:
      current?.project_name === proposal.project_name && current.evidence_sheet
        ? current.evidence_sheet
        : createEvidenceAttachmentSheet(proposal.project_name),
    photo_sheet:
      current?.project_name === proposal.project_name && current.photo_sheet
        ? current.photo_sheet
        : createPhotoAttachmentSheet(proposal.project_name),
    status: current?.status ?? "draft",
    organization_id: proposal.organization_id,
    project_id: proposal.project_id,
    template_code: proposal.template_code,
    budget_scope: proposal.budget_scope,
    budget_category: proposal.budget_category,
    budget_item: proposal.budget_item,
    payment_method: proposal.payment_method,
    vendor_business_number: proposal.vendor_business_number,
    evidence_type: current?.evidence_type ?? "card_payment",
    supply_amount: proposal.supply_amount || proposal.total_amount,
    vat_amount: proposal.vat_amount,
    eligible_amount: proposal.eligible_amount || proposal.total_amount,
    attendee_count: current?.attendee_count ?? 0,
    unit_amount: current?.unit_amount ?? 0,
    evidence_checklist: checklist,
    evidence_completion: buildChecklistCompletion(checklist, current?.evidence_completion),
    compliance_flags: current?.compliance_flags ?? [],
    vat_excluded: current?.vat_excluded ?? false,
  };
}

function mergeProposalIntoExistingExpenditure(
  current: ExpenditureInput,
  proposal: Proposal,
): ExpenditureInput {
  const proposalBased = applyProposalToExpenditureForm(proposal, current);

  return {
    ...current,
    proposal_id: proposal.id,
    project_name: current.project_name || proposalBased.project_name,
    expense_category: current.expense_category || proposalBased.expense_category,
    total_amount: current.total_amount || proposalBased.total_amount,
    payee_company: current.payee_company || proposalBased.payee_company,
    payee_name: current.payee_name || proposalBased.payee_name,
    receipt_name: current.receipt_name || proposalBased.receipt_name,
    organization_id: current.organization_id ?? proposalBased.organization_id,
    project_id: current.project_id ?? proposalBased.project_id,
    template_code: current.template_code || proposalBased.template_code,
    budget_scope: current.budget_scope || proposalBased.budget_scope,
    budget_category: current.budget_category || proposalBased.budget_category,
    budget_item: current.budget_item || proposalBased.budget_item,
    payment_method: current.payment_method || proposalBased.payment_method,
    vendor_business_number: current.vendor_business_number || proposalBased.vendor_business_number,
    supply_amount: current.supply_amount || proposalBased.supply_amount,
    vat_amount: current.vat_amount || proposalBased.vat_amount,
    eligible_amount: current.eligible_amount || proposalBased.eligible_amount,
    items:
      current.items.length &&
      current.items.some((item) => item.description || item.amount || item.note)
        ? current.items
        : proposalBased.items,
    evidence_checklist: current.evidence_checklist.length
      ? current.evidence_checklist
      : proposalBased.evidence_checklist,
    evidence_completion: buildChecklistCompletion(
      current.evidence_checklist.length ? current.evidence_checklist : proposalBased.evidence_checklist,
      current.evidence_completion,
    ),
    evidence_sheet:
      countFilledEvidenceItems(current.evidence_sheet) > 0
        ? current.evidence_sheet
        : proposalBased.evidence_sheet,
    photo_sheet:
      countFilledPhotoItems(current.photo_sheet) > 0 ? current.photo_sheet : proposalBased.photo_sheet,
  };
}

function blankForm(organizations: Organization[], projects: Project[]): ExpenditureInput {
  const project = projects[0] ?? null;
  const organization =
    organizations.find((item) => item.id === project?.organization_id) ?? organizations[0] ?? null;
  return {
    proposal_id: null,
    doc_number: applyDocumentPrefix("", "expenditure", "direct", today()),
    project_name: project?.name ?? "",
    expense_category: "",
    issue_date: today(),
    record_date: today(),
    total_amount: 0,
    payee_address: "",
    payee_company: "",
    payee_name: "",
    receipt_date: today(),
    receipt_name: "",
    items: [emptyItem()],
    evidence_sheet: createEvidenceAttachmentSheet(project?.name),
    photo_sheet: createPhotoAttachmentSheet(project?.name),
    status: "draft",
    ...createDefaultExpenditureGuidelineFields(organization, project),
  };
}

function normalizePayload(form: ExpenditureInput, totalAmount: number): ExpenditureInput {
  const amountMode = getAmountPresentationMode({
    budgetCategory: form.budget_category,
    budgetItem: form.budget_item,
    expenseCategory: form.expense_category,
  });

  if (amountMode === "withholding") {
    const netAmount = form.supply_amount || Math.max(0, form.eligible_amount - form.vat_amount);
    const withholdingAmount = form.vat_amount;
    const grossAmount = form.eligible_amount || mergeWithholdingAmount(netAmount, withholdingAmount);

    return {
      ...form,
      total_amount: totalAmount,
      supply_amount: netAmount,
      vat_amount: withholdingAmount,
      eligible_amount: grossAmount,
      doc_number: applyDocumentPrefix(form.doc_number, "expenditure", form.budget_scope, form.issue_date),
      evidence_checklist: form.evidence_checklist,
      evidence_completion: Object.fromEntries(
        Object.entries(form.evidence_completion).filter(([key]) =>
          form.evidence_checklist.includes(key as ExpenditureInput["evidence_checklist"][number]),
        ),
      ) as ExpenditureInput["evidence_completion"],
    };
  }

  const fallbackFromEligible = form.eligible_amount
    ? form.vat_excluded
      ? { supplyAmount: form.eligible_amount, vatAmount: 0 }
      : splitVatFromTotal(form.eligible_amount)
    : form.vat_excluded
      ? { supplyAmount: totalAmount, vatAmount: 0 }
      : splitVatFromTotal(totalAmount);
  return {
    ...form,
    total_amount: totalAmount,
    supply_amount: form.supply_amount || fallbackFromEligible.supplyAmount,
    vat_amount: form.vat_amount || fallbackFromEligible.vatAmount,
    eligible_amount:
      form.eligible_amount ||
      mergeEligibleAmount(
        form.supply_amount || fallbackFromEligible.supplyAmount,
        form.vat_amount || fallbackFromEligible.vatAmount,
        form.vat_excluded,
      ),
    doc_number: applyDocumentPrefix(form.doc_number, "expenditure", form.budget_scope, form.issue_date),
    evidence_checklist: form.evidence_checklist,
    evidence_completion: Object.fromEntries(
      Object.entries(form.evidence_completion).filter(([key]) =>
        form.evidence_checklist.includes(key as ExpenditureInput["evidence_checklist"][number]),
      ),
    ) as ExpenditureInput["evidence_completion"],
  };
}

export default function ExpenditureManager({ initialFromProposalId = null }: { initialFromProposalId?: string | null }) {
  const [items, setItems] = useState<Expenditure[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [context, setContext] = useState<ContextPayload>({ organizations: [], projects: [] });
  const [proposalDocNumberMap, setProposalDocNumberMap] = useState<Record<number, string>>({});
  const [form, setForm] = useState<ExpenditureInput>(blankForm([], []));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [linkedProposalName, setLinkedProposalName] = useState("");
  const [linkedProposalDocNumber, setLinkedProposalDocNumber] = useState("");
  const [prefilledFromProposalId, setPrefilledFromProposalId] = useState<number | null>(null);

  const organizations = context.organizations;
  const projects = context.projects;
  const availableProjects = projects.filter((project) => (form.organization_id ? project.organization_id === form.organization_id : true));
  const totalAmount = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [form.items]);
  const requiresIdentityCopy = useMemo(
    () =>
      requiresRecipientIdentityCopy({
        budgetItem: form.budget_item,
        expenseCategory: form.expense_category,
        vendorBusinessNumber: form.vendor_business_number,
        vendorName: form.payee_company,
        payeeName: form.payee_name,
      }),
    [form.budget_item, form.expense_category, form.vendor_business_number, form.payee_company, form.payee_name],
  );
  const displayEvidenceChecklist = useMemo(() => form.evidence_checklist, [form.evidence_checklist]);
  const pendingChecklist = useMemo(
    () => displayEvidenceChecklist.filter((key) => !form.evidence_completion[key]),
    [displayEvidenceChecklist, form.evidence_completion],
  );
  const amountMode = useMemo(
    () =>
      getAmountPresentationMode({
        budgetCategory: form.budget_category,
        budgetItem: form.budget_item,
        expenseCategory: form.expense_category,
      }),
    [form.budget_category, form.budget_item, form.expense_category],
  );
  const amountLabels = useMemo(() => getAmountFieldLabels(amountMode), [amountMode]);

  function updateSupplyAmount(supplyAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.expense_category,
      });

      return {
        ...current,
        supply_amount: supplyAmount,
        eligible_amount:
          currentMode === "withholding"
            ? mergeWithholdingAmount(supplyAmount, current.vat_amount)
            : mergeEligibleAmount(supplyAmount, current.vat_amount, current.vat_excluded),
      };
    });
  }

  function updateVatAmount(vatAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.expense_category,
      });

      return {
        ...current,
        vat_amount: vatAmount,
        eligible_amount:
          currentMode === "withholding"
            ? mergeWithholdingAmount(current.supply_amount, vatAmount)
            : mergeEligibleAmount(current.supply_amount, vatAmount, current.vat_excluded),
      };
    });
  }

  function updateEligibleAmount(eligibleAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.expense_category,
      });

      if (currentMode === "withholding") {
        return {
          ...current,
          eligible_amount: eligibleAmount,
          supply_amount: Math.max(0, eligibleAmount - current.vat_amount),
        };
      }

      if (current.vat_excluded) {
        return {
          ...current,
          eligible_amount: eligibleAmount,
          supply_amount: eligibleAmount,
          vat_amount: 0,
        };
      }

      const { supplyAmount, vatAmount } = splitVatFromTotal(eligibleAmount);
      return {
        ...current,
        eligible_amount: eligibleAmount,
        supply_amount: supplyAmount,
        vat_amount: vatAmount,
      };
    });
  }
  const warnings = useMemo(() => {
    const next: string[] = [];
    if ((form.expense_category.includes("회의") || form.budget_item.includes("회의")) && form.attendee_count > 0 && form.unit_amount > 15000) next.push("회의비 단가가 1인 15,000원을 초과합니다.");
    if (amountMode === "vat" && form.vat_amount > 0 && !form.vat_excluded) next.push("환급 대상 부가세 제외 여부를 확인하세요.");
    if (!form.budget_category || !form.budget_item) next.push("비목과 세목이 비어 있습니다.");
    if (form.payment_method === "account_transfer" && requiresIdentityCopy) next.push("개인 강사·전문가 계좌이체 건은 신분증 사본과 통장사본을 함께 첨부하세요.");
    return next;
  }, [amountMode, form, requiresIdentityCopy]);

  async function fetchList() {
    const [expenditureResponse, proposalResponse] = await Promise.all([
      fetch("/api/expenditures"),
      fetch("/api/proposals"),
    ]);
    const [expenditures, proposals] = await Promise.all([expenditureResponse.json(), proposalResponse.json()]);
    setItems(expenditures);
    setProposalDocNumberMap(
      Object.fromEntries(
        (proposals as Proposal[]).map((proposal) => [proposal.id, proposal.doc_number || ""]),
      ),
    );
  }

  async function loadLinkedProposal(proposalId: number | null, fallbackProjectName = "") {
    if (!proposalId) {
      setLinkedProposalName("");
      setLinkedProposalDocNumber("");
      return;
    }

    try {
      const response = await fetch(`/api/proposals/${proposalId}`);
      const proposal: Proposal = await response.json();
      if (!proposal?.id) {
        setLinkedProposalName(fallbackProjectName);
        setLinkedProposalDocNumber("");
        return;
      }

      setLinkedProposalName(proposal.project_name || fallbackProjectName);
      setLinkedProposalDocNumber(proposal.doc_number || "");
    } catch {
      setLinkedProposalName(fallbackProjectName);
      setLinkedProposalDocNumber("");
    }
  }

  async function refillFromLinkedProposal(proposalId: number, preserveCurrent = true) {
    const response = await fetch(`/api/proposals/${proposalId}`);
    const proposal: Proposal = await response.json();
    if (!proposal?.id) return;

    setForm((current) => applyProposalToExpenditureForm(proposal, preserveCurrent ? current : null));
    setLinkedProposalName(proposal.project_name);
    setLinkedProposalDocNumber(proposal.doc_number || "");
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/expenditures"), fetch("/api/context"), fetch("/api/proposals")]).then(async ([a, b, c]) => {
      const [expenditures, nextContext, proposals] = await Promise.all([a.json(), b.json(), c.json()]);
      if (!active) return;
      setItems(expenditures);
      setContext(nextContext);
      setProposalDocNumberMap(
        Object.fromEntries(
          (proposals as Proposal[]).map((proposal) => [proposal.id, proposal.doc_number || ""]),
        ),
      );
      setForm((current) => (current.organization_id || current.project_id ? current : blankForm(nextContext.organizations ?? [], nextContext.projects ?? [])));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fromProposalId = initialFromProposalId;
    if (!fromProposalId || editingId || prefilledFromProposalId === Number(fromProposalId)) return;
    let active = true;
    fetch(`/api/proposals/${fromProposalId}`)
      .then((response) => response.json())
      .then((proposal: Proposal) => {
        if (!active || !proposal?.id) return;
        setForm(applyProposalToExpenditureForm(proposal));
        setLinkedProposalName(proposal.project_name);
        setLinkedProposalDocNumber(proposal.doc_number || "");
        setPrefilledFromProposalId(proposal.id);
        setOpen(true);
      });
    return () => {
      active = false;
    };
  }, [editingId, initialFromProposalId, prefilledFromProposalId]);

  async function openForEdit(id: number) {
    const response = await fetch(`/api/expenditures/${id}`);
    const data = await response.json();
    setEditingId(id);
    if (data.proposal_id) {
      try {
        const proposalResponse = await fetch(`/api/proposals/${data.proposal_id}`);
        const proposal: Proposal = await proposalResponse.json();
        if (proposal?.id) {
          setForm(mergeProposalIntoExistingExpenditure(data, proposal));
          setLinkedProposalName(proposal.project_name || data.project_name || "");
          setLinkedProposalDocNumber(proposal.doc_number || "");
        } else {
          setForm(data);
          await loadLinkedProposal(data.proposal_id ?? null, data.project_name ?? "");
        }
      } catch {
        setForm(data);
        await loadLinkedProposal(data.proposal_id ?? null, data.project_name ?? "");
      }
    } else {
      setForm(data);
      await loadLinkedProposal(data.proposal_id ?? null, data.project_name ?? "");
    }
    setOpen(true);
  }

  async function save(status: Expenditure["status"]) {
    if (!hasDocumentNumberSuffix(form.doc_number, "expenditure", form.budget_scope, form.issue_date)) {
      window.alert("문서번호 뒤 번호까지 입력한 뒤 저장해주세요. 예: 다다름-간접-결의-26-0330-01");
      return;
    }

    if (status === "finalized" && pendingChecklist.length > 0) {
      window.alert("필수 증빙 완료 체크가 남아 있습니다.");
      return;
    }
    await fetch(editingId ? `/api/expenditures/${editingId}` : "/api/expenditures", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizePayload({ ...form, status }, totalAmount)),
    });
    setOpen(false);
    setEditingId(null);
    setForm(blankForm(organizations, projects));
    setLinkedProposalName("");
    setLinkedProposalDocNumber("");
    fetchList();
  }

  async function remove(id: number) {
    await fetch(`/api/expenditures/${id}`, { method: "DELETE" });
    fetchList();
    setSelected((current) => current.filter((item) => item !== id));
  }

  function updateOrganization(id: number) {
    const organization = organizations.find((item) => item.id === id) ?? null;
    const project = projects.find((item) => item.organization_id === id) ?? null;
    setForm((current) => ({
      ...current,
      organization_id: organization?.id ?? null,
      project_id: project?.id ?? null,
      project_name: project?.name ?? current.project_name,
      template_code: organization?.default_template_code ?? current.template_code,
      doc_number: applyDocumentPrefix(current.doc_number, "expenditure", current.budget_scope, current.issue_date),
      evidence_sheet: createEvidenceAttachmentSheet(project?.name ?? current.project_name),
      photo_sheet: createPhotoAttachmentSheet(project?.name ?? current.project_name),
    }));
  }

  function updateProject(id: number) {
    const project = projects.find((item) => item.id === id) ?? null;
    const organization = organizations.find((item) => item.id === project?.organization_id) ?? null;
    setForm((current) => ({
      ...current,
      organization_id: organization?.id ?? current.organization_id,
      project_id: project?.id ?? null,
      project_name: project?.name ?? current.project_name,
      template_code: organization?.default_template_code ?? current.template_code,
      doc_number: applyDocumentPrefix(current.doc_number, "expenditure", current.budget_scope, current.issue_date),
      evidence_sheet: createEvidenceAttachmentSheet(project?.name ?? current.project_name),
      photo_sheet: createPhotoAttachmentSheet(project?.name ?? current.project_name),
    }));
  }

  function toggleChecklist(key: ExpenditureInput["evidence_checklist"][number]) {
    setForm((current) => {
      const exists = current.evidence_checklist.includes(key);
      const evidence_completion = { ...current.evidence_completion };
      if (exists) delete evidence_completion[key];
      return {
        ...current,
        evidence_checklist: exists ? current.evidence_checklist.filter((item) => item !== key) : [...current.evidence_checklist, key],
        evidence_completion,
      };
    });
  }

  const batchHref = `/batch-preview?ids=${selected.join(",")}`;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-6 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Resolution Workspace</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">지출결의서 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">실제 지급내역과 증빙 완료 상태를 함께 관리합니다.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setLinkedProposalName(""); setLinkedProposalDocNumber(""); setForm(blankForm(organizations, projects)); setOpen(true); }}>
            <Plus className="h-4 w-4" />새 결의서
          </button>
          {selected.length > 0 ? <Link className="btn btn-secondary" href={batchHref} target="_blank"><Printer className="h-4 w-4" />선택 {selected.length}건 인쇄</Link> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[{ label: "전체", value: items.length }, { label: "작성중", value: items.filter((item) => item.status === "draft").length }, { label: "완료", value: items.filter((item) => item.status === "finalized").length }, { label: "증빙대기", value: items.filter((item) => item.evidence_checklist.some((key) => !item.evidence_completion[key])).length }].map((card) => (
          <div key={card.label} className="panel px-5 py-5"><div className="text-sm text-slate-500">{card.label}</div><div className="mt-3 text-3xl font-semibold">{card.value}</div></div>
        ))}
      </section>

      <section className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">선택</th><th className="px-4 py-3">사업</th><th className="px-4 py-3">예산항목</th><th className="px-4 py-3">지급방법</th><th className="px-4 py-3">증빙</th><th className="px-4 py-3 text-right">금액</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">액션</th></tr></thead><tbody>{items.map((item) => { const pending = item.evidence_checklist.filter((key) => !item.evidence_completion[key]).length; const linkedProposalDocNumber = item.proposal_id ? proposalDocNumberMap[item.proposal_id] || `#${item.proposal_id}` : "없음"; return <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])} /></td><td className="px-4 py-3"><div className="font-medium">{item.project_name}</div><div className="mt-1 text-xs text-slate-500">품의 {linkedProposalDocNumber}</div></td><td className="px-4 py-3"><div>{item.budget_category || "-"}</div><div className="mt-1 text-xs text-slate-500">{budgetScopeLabel(item.budget_scope)} / {item.budget_item || "-"}</div></td><td className="px-4 py-3">{paymentMethodLabel(item.payment_method)}</td><td className="px-4 py-3"><div className="text-xs text-slate-600">첨부 {countFilledEvidenceItems(item.evidence_sheet)} / 사진 {countFilledPhotoItems(item.photo_sheet)}</div><div className={`mt-1 text-xs ${pending ? "text-amber-600" : "text-emerald-600"}`}>{pending ? `${pending}개 미완료` : "체크 완료"}</div></td><td className="px-4 py-3 text-right">{formatCurrency(item.total_amount)}원</td><td className="px-4 py-3"><span className={`badge ${item.status === "finalized" ? "badge-finalized" : "badge-draft"}`}>{item.status === "finalized" ? "완료" : "작성중"}</span></td><td className="px-4 py-3"><div className="flex gap-2"><Link className="btn btn-secondary !px-3 !py-2" href={`/preview/${item.id}`} target="_blank"><Eye className="h-4 w-4" /></Link><Link className="btn btn-secondary !px-3 !py-2" href={`/expenditures/${item.id}/evidence`}>증빙</Link><Link className="btn btn-secondary !px-3 !py-2" href={`/expenditures/${item.id}/photos`}>사진</Link><button className="btn btn-secondary !px-3 !py-2" onClick={() => openForEdit(item.id)}>수정</button><button className="btn btn-danger !px-3 !py-2" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div></section>

      {open ? <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4"><div className="panel max-h-[92vh] w-full max-w-6xl overflow-y-auto px-6 py-6"><div className="mb-6 flex items-center justify-between"><div><div className="text-sm text-slate-500">지출결의서</div><h2 className="text-2xl font-semibold">{editingId ? "결의서 수정" : "새 결의서 작성"}</h2>{form.proposal_id ? <p className="mt-2 text-sm text-teal-700">연결 품의서 {linkedProposalDocNumber || `#${form.proposal_id}`}{linkedProposalName ? ` · ${linkedProposalName}` : ""}</p> : null}</div><div className="flex items-center gap-2">{form.proposal_id ? <button className="btn btn-secondary" onClick={() => refillFromLinkedProposal(form.proposal_id!)}>품의 내용 다시 불러오기</button> : null}<button className="btn btn-secondary" onClick={() => setOpen(false)}>닫기</button></div></div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block text-sm">지원기관<select className="select mt-2" value={form.organization_id ?? ""} onChange={(event) => updateOrganization(Number(event.target.value))}><option value="">지원기관 선택</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
          <label className="block text-sm">사업<select className="select mt-2" value={form.project_id ?? ""} onChange={(event) => updateProject(Number(event.target.value))}><option value="">사업 선택</option>{availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="block text-sm">연결 품의서<input className="field mt-2" value={linkedProposalDocNumber || (form.proposal_id ? `#${form.proposal_id}` : "")} readOnly placeholder="연결 품의서 없음" /></label>
          <label className="block text-sm">문서번호<input className="field mt-2" value={form.doc_number} onChange={(event) => setForm({ ...form, doc_number: event.target.value })} /><div className="mt-1 text-xs text-slate-500">기본 형식: `다다름-직접-결의-26-` 또는 `다다름-간접-결의-26-`</div></label>
          <label className="block text-sm md:col-span-2">사업명<input className="field mt-2" value={form.project_name} onChange={(event) => setForm({ ...form, project_name: event.target.value })} /></label>
          <label className="block text-sm">발의일<input className="field mt-2" type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value, doc_number: applyDocumentPrefix(form.doc_number, "expenditure", form.budget_scope, event.target.value) })} /></label>
          <label className="block text-sm">기록일<input className="field mt-2" type="date" value={form.record_date} onChange={(event) => setForm({ ...form, record_date: event.target.value })} /></label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <label className="block text-sm">예산구분<select className="select mt-2" value={form.budget_scope} onChange={(event) => setForm({ ...form, budget_scope: event.target.value as ExpenditureInput["budget_scope"], doc_number: applyDocumentPrefix(form.doc_number, "expenditure", event.target.value as ExpenditureInput["budget_scope"], form.issue_date) })}>{budgetScopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm">비목<input className="field mt-2" value={form.budget_category} onChange={(event) => setForm({ ...form, budget_category: event.target.value })} /></label>
          <label className="block text-sm">세목<input className="field mt-2" value={form.budget_item} onChange={(event) => setForm({ ...form, budget_item: event.target.value })} /></label>
          <label className="block text-sm">적요<input className="field mt-2" value={form.expense_category} onChange={(event) => setForm({ ...form, expense_category: event.target.value })} /></label>
          <label className="block text-sm">지급방법<select className="select mt-2" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value as ExpenditureInput["payment_method"], evidence_checklist: buildEvidenceChecklist(event.target.value as ExpenditureInput["payment_method"], { budgetItem: form.budget_item, expenseCategory: form.expense_category, vendorBusinessNumber: form.vendor_business_number, vendorName: form.payee_company, payeeName: form.payee_name }), evidence_completion: {} })}>{paymentMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm">증빙유형<select className="select mt-2" value={form.evidence_type} onChange={(event) => setForm({ ...form, evidence_type: event.target.value as ExpenditureInput["evidence_type"] })}>{evidenceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm">거래처<input className="field mt-2" value={form.payee_company} onChange={(event) => setForm({ ...form, payee_company: event.target.value })} /></label>
          <label className="block text-sm">{amountLabels.vendorId}<input className="field mt-2" value={form.vendor_business_number} onChange={(event) => setForm({ ...form, vendor_business_number: event.target.value })} /></label>
          <label className="block text-sm">수령인명<input className="field mt-2" value={form.payee_name} onChange={(event) => setForm({ ...form, payee_name: event.target.value })} /></label>
          <label className="block text-sm">영수증명<input className="field mt-2" value={form.receipt_name} onChange={(event) => setForm({ ...form, receipt_name: event.target.value })} /></label>
          <label className="block text-sm">영수일자<input className="field mt-2" type="date" value={form.receipt_date} onChange={(event) => setForm({ ...form, receipt_date: event.target.value })} /></label>
          <label className="block text-sm md:col-span-4">주소<input className="field mt-2" value={form.payee_address} onChange={(event) => setForm({ ...form, payee_address: event.target.value })} /></label>
          <label className="block text-sm">{amountLabels.firstAmount}<CurrencyInput className="field mt-2" value={form.supply_amount} onChange={updateSupplyAmount} /></label>
          <label className="block text-sm">{amountLabels.secondAmount}<CurrencyInput className="field mt-2" value={form.vat_amount} onChange={updateVatAmount} /></label>
          <label className="block text-sm">{amountLabels.thirdAmount}<CurrencyInput className="field mt-2" value={form.eligible_amount} onChange={updateEligibleAmount} /></label>
          {amountMode === "withholding" ? <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">인건비·강사비·기타소득은 실지급액 + 원천징수액 = 지급총액(세전) 기준으로 입력합니다.</div> : <label className="flex items-center gap-2 rounded-3xl border border-slate-200 px-4 py-3 text-sm"><input type="checkbox" checked={form.vat_excluded} onChange={(event) => setForm((current) => ({ ...current, vat_excluded: event.target.checked, supply_amount: event.target.checked ? current.eligible_amount : current.supply_amount, vat_amount: event.target.checked ? 0 : current.vat_amount, eligible_amount: event.target.checked ? current.eligible_amount : mergeEligibleAmount(current.supply_amount, current.vat_amount, false) }))} />{amountLabels.exclusionLabel}</label>}
          <label className="block text-sm">참석인원<input className="field mt-2" type="number" value={form.attendee_count} onChange={(event) => setForm({ ...form, attendee_count: Number(event.target.value) })} /></label>
          <label className="block text-sm">1인단가<CurrencyInput className="field mt-2" value={form.unit_amount} onChange={(value) => setForm({ ...form, unit_amount: value })} /></label>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3">적요</th><th className="px-3 py-3">금액</th><th className="px-3 py-3">비고</th><th className="px-3 py-3">삭제</th></tr></thead><tbody>{form.items.map((item, index) => <tr key={index} className="border-t border-slate-100"><td className="px-2 py-2"><input className="field" value={item.description} onChange={(event) => { const next = [...form.items]; next[index] = { ...next[index], description: event.target.value }; setForm({ ...form, items: next }); }} /></td><td className="px-2 py-2"><CurrencyInput className="field" value={item.amount} onChange={(value) => { const next = [...form.items]; next[index] = { ...next[index], amount: value }; setForm({ ...form, items: next }); }} /></td><td className="px-2 py-2"><input className="field" value={item.note} onChange={(event) => { const next = [...form.items]; next[index] = { ...next[index], note: event.target.value }; setForm({ ...form, items: next }); }} /></td><td className="px-2 py-2 text-center"><button className="btn btn-danger !px-3 !py-2" onClick={() => setForm({ ...form, items: form.items.length === 1 ? [emptyItem()] : form.items.filter((_, i) => i !== index) })}>삭제</button></td></tr>)}</tbody></table></div>
        <div className="mt-3 flex items-center justify-between"><button className="btn btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>행 추가</button><div className="text-sm font-semibold text-slate-700">합계 {formatCurrency(totalAmount)}원</div></div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <EvidenceChecklistSelector title="필수 증빙 체크리스트" description="결의 단계에서 실제로 챙겨야 할 기본 증빙입니다." selected={displayEvidenceChecklist} onToggle={toggleChecklist} />
          <div className="rounded-3xl border border-slate-200 p-4"><div className="text-sm font-semibold text-slate-900">증빙 완료 체크</div><div className="mt-4 space-y-2">{displayEvidenceChecklist.length ? displayEvidenceChecklist.map((key) => <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm"><span>{evidenceChecklistLabel(key)}</span><input type="checkbox" checked={Boolean(form.evidence_completion[key])} onChange={() => setForm({ ...form, evidence_completion: { ...form.evidence_completion, [key]: !form.evidence_completion[key] } })} /></label>) : <div className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">체크리스트를 먼저 선택하세요.</div>}</div></div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className={`rounded-3xl px-4 py-4 text-sm ${warnings.length ? "border border-amber-200 bg-amber-50 text-amber-900" : "border border-emerald-200 bg-emerald-50 text-emerald-900"}`}><div className="font-semibold">{warnings.length ? "확인할 항목" : "기본 확인 완료"}</div>{warnings.length ? <ul className="mt-2 space-y-1">{warnings.map((warning) => <li key={warning}>- {warning}</li>)}</ul> : <div className="mt-2">현재 입력 기준으로 큰 경고는 없습니다.</div>}</div>
          <div className="rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-700"><div className="font-semibold text-slate-900">정산 메모</div><div className="mt-2 space-y-2"><div>지급방법: {paymentMethodLabel(form.payment_method)}</div><div>증빙유형: {evidenceTypeLabel(form.evidence_type)}</div><div>미완료 증빙: {pendingChecklist.length}건</div></div></div>
        </div>

        <div className="mt-6 flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => save("draft")}>임시저장</button><button className="btn btn-primary" onClick={() => save("finalized")}>저장 완료</button></div>
      </div></div> : null}
    </div>
  );
}
