"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Eye, Plus, Printer, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import EvidenceChecklistSelector from "@/components/EvidenceChecklistSelector";
import {
  getAmountFieldLabels,
  getAmountPresentationMode,
  mergeWithholdingAmount,
} from "@/lib/amount-presentation";
import { createDefaultProposalGuidelineFields } from "@/lib/document-defaults";
import { applyDocumentPrefix, hasDocumentNumberSuffix } from "@/lib/document-number";
import { formatCurrency, mergeEligibleAmount, splitVatFromTotal, today } from "@/lib/format";
import {
  buildEvidenceChecklist,
  budgetScopeLabel,
  budgetScopeOptions,
  paymentMethodLabel,
  paymentMethodOptions,
  requiresRecipientIdentityCopy,
} from "@/lib/guideline";
import type { Organization, Project, Proposal, ProposalInput, ProposalItem } from "@/lib/types";

type ContextPayload = {
  organizations: Organization[];
  projects: Project[];
};

const emptyItem = (): ProposalItem => ({
  expense_category: "",
  description: "",
  estimated_amount: 0,
  calculation_basis: "",
  note: "",
});

function buildProjectPeriod(project?: Project | null) {
  if (!project?.starts_on && !project?.ends_on) return "";
  return `${project?.starts_on || ""} ~ ${project?.ends_on || ""}`.trim();
}

function blankProposal(organizations: Organization[], projects: Project[]): ProposalInput {
  const project = projects[0] ?? null;
  const organization =
    organizations.find((item) => item.id === project?.organization_id) ?? organizations[0] ?? null;

  return {
    doc_number: applyDocumentPrefix("", "proposal", "direct", today()),
    fund_type: "grant",
    project_name: project?.name ?? "",
    project_period: buildProjectPeriod(project),
    total_amount: 0,
    related_plan: "",
    org_name: organization?.name ?? "협동조합 소이랩",
    submission_date: today(),
    items: [emptyItem()],
    status: "draft",
    ...createDefaultProposalGuidelineFields(organization, project),
  };
}

function cloneProposalForReuse(
  proposal: Proposal,
  organizations: Organization[],
  projects: Project[],
): ProposalInput {
  const project = projects.find((item) => item.id === proposal.project_id) ?? null;
  const organization =
    organizations.find((item) => item.id === proposal.organization_id) ?? organizations[0] ?? null;
  const nextDate = today();

  return {
    ...proposal,
    doc_number: applyDocumentPrefix("", "proposal", proposal.budget_scope, nextDate),
    org_name: organization?.name ?? proposal.org_name,
    project_name: project?.name ?? proposal.project_name,
    project_period: project ? buildProjectPeriod(project) : proposal.project_period,
    submission_date: nextDate,
    planned_payment_date: nextDate,
    status: "draft",
    items: proposal.items.length ? proposal.items.map((item) => ({ ...item })) : [emptyItem()],
    evidence_checklist: [...proposal.evidence_checklist],
    compliance_flags: [...proposal.compliance_flags],
  };
}

function normalizeProposalPayload(form: ProposalInput, totalAmount: number): ProposalInput {
  const amountMode = getAmountPresentationMode({
    budgetCategory: form.budget_category,
    budgetItem: form.budget_item,
    expenseCategory: form.items.map((item) => item.expense_category).join(" "),
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
      evidence_checklist: form.evidence_checklist,
      doc_number: applyDocumentPrefix(form.doc_number, "proposal", form.budget_scope, form.submission_date),
    };
  }

  const fallbackFromEligible = form.eligible_amount ? splitVatFromTotal(form.eligible_amount) : splitVatFromTotal(totalAmount);
  const supplyAmount = form.supply_amount || fallbackFromEligible.supplyAmount;
  const vatAmount = form.vat_amount || fallbackFromEligible.vatAmount;
  const eligibleAmount = form.eligible_amount || mergeEligibleAmount(supplyAmount, vatAmount);
  return {
    ...form,
    total_amount: totalAmount,
    supply_amount: supplyAmount,
    vat_amount: vatAmount,
    eligible_amount: eligibleAmount,
    evidence_checklist: form.evidence_checklist,
    doc_number: applyDocumentPrefix(form.doc_number, "proposal", form.budget_scope, form.submission_date),
  };
}

export default function ProposalManager() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [context, setContext] = useState<ContextPayload>({ organizations: [], projects: [] });
  const [form, setForm] = useState<ProposalInput>(blankProposal([], []));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const organizations = context.organizations;
  const projects = context.projects;
  const availableProjects = projects.filter((project) =>
    form.organization_id ? project.organization_id === form.organization_id : true,
  );

  async function fetchList() {
    const response = await fetch("/api/proposals");
    setItems(await response.json());
  }

  useEffect(() => {
    let active = true;

    Promise.all([fetch("/api/proposals"), fetch("/api/context")])
      .then(async ([proposalResponse, contextResponse]) => {
        const [proposalData, contextData] = await Promise.all([
          proposalResponse.json(),
          contextResponse.json(),
        ]);

        if (!active) return;
        setItems(proposalData);
        setContext(contextData);
        setForm((current) =>
          current.organization_id || current.project_id
            ? current
            : blankProposal(contextData.organizations ?? [], contextData.projects ?? []),
        );
      })
      .catch(() => {
        if (!active) return;
        setForm(blankProposal([], []));
      });

    return () => {
      active = false;
    };
  }, []);

  const totalAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.estimated_amount || 0), 0),
    [form.items],
  );
  const requiresIdentityCopy = useMemo(
    () =>
      requiresRecipientIdentityCopy({
        budgetItem: form.budget_item,
        expenseCategory: form.items.map((item) => item.expense_category).join(" "),
        vendorBusinessNumber: form.vendor_business_number,
        vendorName: form.vendor_name,
      }),
    [form.budget_item, form.items, form.vendor_business_number, form.vendor_name],
  );
  const displayEvidenceChecklist = useMemo(() => form.evidence_checklist, [form.evidence_checklist]);
  const amountMode = useMemo(
    () =>
      getAmountPresentationMode({
        budgetCategory: form.budget_category,
        budgetItem: form.budget_item,
        expenseCategory: form.items.map((item) => item.expense_category).join(" "),
      }),
    [form.budget_category, form.budget_item, form.items],
  );
  const amountLabels = useMemo(() => getAmountFieldLabels(amountMode), [amountMode]);

  function updateSupplyAmount(supplyAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.items.map((item) => item.expense_category).join(" "),
      });

      return {
        ...current,
        supply_amount: supplyAmount,
        eligible_amount:
          currentMode === "withholding"
            ? mergeWithholdingAmount(supplyAmount, current.vat_amount)
            : mergeEligibleAmount(supplyAmount, current.vat_amount),
      };
    });
  }

  function updateVatAmount(vatAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.items.map((item) => item.expense_category).join(" "),
      });

      return {
        ...current,
        vat_amount: vatAmount,
        eligible_amount:
          currentMode === "withholding"
            ? mergeWithholdingAmount(current.supply_amount, vatAmount)
            : mergeEligibleAmount(current.supply_amount, vatAmount),
      };
    });
  }

  function updateEligibleAmount(eligibleAmount: number) {
    setForm((current) => {
      const currentMode = getAmountPresentationMode({
        budgetCategory: current.budget_category,
        budgetItem: current.budget_item,
        expenseCategory: current.items.map((item) => item.expense_category).join(" "),
      });

      if (currentMode === "withholding") {
        return {
          ...current,
          eligible_amount: eligibleAmount,
          supply_amount: Math.max(0, eligibleAmount - current.vat_amount),
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

    if (form.requires_foundation_approval) {
      next.push("재단 승인 대상 전용 또는 예외 집행으로 표시되어 있습니다.");
    }

    if (amountMode === "vat" && form.vat_amount > 0 && form.eligible_amount >= totalAmount) {
      next.push("부가세가 있는 건은 집행인정금액을 다시 확인하는 것이 좋습니다.");
    }

    if (!form.budget_category || !form.budget_item) {
      next.push("비목과 세목이 아직 비어 있습니다.");
    }

    if (!form.vendor_name) {
      next.push("거래처명을 입력해두는 것이 정산에 유리합니다.");
    }

    if (form.payment_method === "account_transfer" && requiresIdentityCopy) {
      next.push("개인 강사·전문가 계좌이체 건은 신분증 사본과 통장사본을 함께 첨부하세요.");
    }

    return next;
  }, [amountMode, form, totalAmount, requiresIdentityCopy]);

  async function openForEdit(id: number) {
    const response = await fetch(`/api/proposals/${id}`);
    const data = await response.json();
    setEditingId(id);
    setForm(data);
    setOpen(true);
  }

  function openForCreate() {
    setEditingId(null);
    setForm(blankProposal(organizations, projects));
    setOpen(true);
  }

  async function save(status: Proposal["status"]) {
    if (!hasDocumentNumberSuffix(form.doc_number, "proposal", form.budget_scope, form.submission_date)) {
      window.alert("문서번호 뒤 번호까지 입력한 뒤 저장해주세요. 예: 다다름-간접-품의-26-0330-01");
      return;
    }

    const payload = normalizeProposalPayload({ ...form, status }, totalAmount);
    await fetch(editingId ? `/api/proposals/${editingId}` : "/api/proposals", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditingId(null);
    setForm(blankProposal(organizations, projects));
    fetchList();
  }

  async function remove(id: number) {
    await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    fetchList();
    setSelected((current) => current.filter((item) => item !== id));
  }

  function duplicateProposal(source: Proposal) {
    setEditingId(null);
    setForm(cloneProposalForReuse(source, organizations, projects));
    setOpen(true);
  }

  function duplicateSelected() {
    if (selected.length !== 1) return;
    const source = items.find((item) => item.id === selected[0]);
    if (!source) return;
    duplicateProposal(source);
  }

  function updateOrganization(nextOrganizationId: number) {
    const organization = organizations.find((item) => item.id === nextOrganizationId) ?? null;
    const nextProject =
      projects.find((project) => project.organization_id === nextOrganizationId && project.id === form.project_id) ??
      projects.find((project) => project.organization_id === nextOrganizationId) ??
      null;

    setForm((current) => ({
      ...current,
      organization_id: organization?.id ?? null,
      org_name: organization?.name ?? "",
      template_code: organization?.default_template_code ?? current.template_code,
      project_id: nextProject?.id ?? null,
      project_name: nextProject?.name ?? "",
      project_period: nextProject ? buildProjectPeriod(nextProject) : "",
      doc_number: applyDocumentPrefix(current.doc_number, "proposal", current.budget_scope, current.submission_date),
    }));
  }

  function updateProject(nextProjectId: number) {
    const project = projects.find((item) => item.id === nextProjectId) ?? null;
    const organization = organizations.find((item) => item.id === project?.organization_id) ?? null;

    setForm((current) => ({
      ...current,
      organization_id: organization?.id ?? current.organization_id,
      org_name: organization?.name ?? current.org_name,
      project_id: project?.id ?? null,
      project_name: project?.name ?? "",
      project_period: project ? buildProjectPeriod(project) : current.project_period,
      template_code: organization?.default_template_code ?? current.template_code,
      doc_number: applyDocumentPrefix(current.doc_number, "proposal", current.budget_scope, current.submission_date),
    }));
  }

  function toggleChecklist(key: ProposalInput["evidence_checklist"][number]) {
    setForm((current) => ({
      ...current,
      evidence_checklist: current.evidence_checklist.includes(key)
        ? current.evidence_checklist.filter((item) => item !== key)
        : [...current.evidence_checklist, key],
    }));
  }

  const batchHref = `/proposals/batch-preview?ids=${selected.join(",")}`;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-6 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Proposal Workspace</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">지출품의서 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            지원기관과 사업을 기준으로 지출품의서를 작성하고, 예산 비목과 증빙 요건을 함께 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={openForCreate}>
            <Plus className="h-4 w-4" />
            새 품의서
          </button>
          {selected.length === 1 ? (
            <button className="btn btn-secondary" onClick={duplicateSelected}>
              <Plus className="h-4 w-4" />
              선택 1건 복제
            </button>
          ) : null}
          {selected.length > 0 ? (
            <Link className="btn btn-secondary" href={batchHref} target="_blank">
              <Printer className="h-4 w-4" />
              선택 {selected.length}건 인쇄
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "전체", value: items.length },
          { label: "작성중", value: items.filter((item) => item.status === "draft").length },
          { label: "완료", value: items.filter((item) => item.status === "finalized").length },
          { label: "승인체크", value: items.filter((item) => item.requires_foundation_approval).length },
        ].map((card) => (
          <div key={card.label} className="panel px-5 py-5">
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">선택</th>
                <th className="px-4 py-3">지원기관/사업</th>
                <th className="px-4 py-3">예산항목</th>
                <th className="px-4 py-3">지급방법</th>
                <th className="px-4 py-3 text-right">금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item.id)
                            ? current.filter((value) => value !== item.id)
                            : [...current, item.id],
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.project_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.org_name || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{item.budget_category || "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {budgetScopeLabel(item.budget_scope)} / {item.budget_item || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{paymentMethodLabel(item.payment_method)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.total_amount)}원</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`badge ${item.status === "finalized" ? "badge-finalized" : "badge-draft"}`}>
                        {item.status === "finalized" ? "완료" : "작성중"}
                      </span>
                      {item.requires_foundation_approval ? (
                        <span className="text-xs font-medium text-amber-600">승인 필요</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn btn-secondary !px-3 !py-2" href={`/proposals/preview/${item.id}`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link className="btn btn-primary !px-3 !py-2" href={`/?fromProposalId=${item.id}`}>
                        <ArrowRightLeft className="h-4 w-4" />
                        결의서 작성
                      </Link>
                      <button className="btn btn-secondary !px-3 !py-2" onClick={() => openForEdit(item.id)}>
                        수정
                      </button>
                      <button className="btn btn-secondary !px-3 !py-2" onClick={() => duplicateProposal(item)}>
                        복제
                      </button>
                      <button className="btn btn-danger !px-3 !py-2" onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4">
          <div className="panel max-h-[92vh] w-full max-w-6xl overflow-y-auto px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">지출품의서</div>
                <h2 className="text-2xl font-semibold">{editingId ? "품의서 수정" : "새 품의서 작성"}</h2>
              </div>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="block text-sm">
                지원기관
                <select
                  className="select mt-2"
                  value={form.organization_id ?? ""}
                  onChange={(event) => updateOrganization(Number(event.target.value))}
                >
                  <option value="">지원기관 선택</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                사업
                <select
                  className="select mt-2"
                  value={form.project_id ?? ""}
                  onChange={(event) => updateProject(Number(event.target.value))}
                >
                  <option value="">사업 선택</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                재원구분
                <select
                  className="select mt-2"
                  value={form.fund_type}
                  onChange={(event) => setForm({ ...form, fund_type: event.target.value as Proposal["fund_type"] })}
                >
                  <option value="grant">보조금</option>
                  <option value="self">자부담</option>
                  <option value="both">혼합</option>
                </select>
              </label>
              <label className="block text-sm">
                작성일
                <input
                  className="field mt-2"
                  type="date"
                  value={form.submission_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      submission_date: event.target.value,
                      doc_number: applyDocumentPrefix(
                        form.doc_number,
                        "proposal",
                        form.budget_scope,
                        event.target.value,
                      ),
                    })
                  }
                />
              </label>
              <label className="block text-sm md:col-span-2">
                사업명
                <input
                  className="field mt-2"
                  value={form.project_name}
                  onChange={(event) => setForm({ ...form, project_name: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                사업기간
                <input
                  className="field mt-2"
                  value={form.project_period}
                  onChange={(event) => setForm({ ...form, project_period: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                문서번호
                <input
                  className="field mt-2"
                  value={form.doc_number}
                  onChange={(event) => setForm({ ...form, doc_number: event.target.value })}
                />
                <div className="mt-1 text-xs text-slate-500">
                  기본 형식: `다다름-직접-품의-26-` 또는 `다다름-간접-품의-26-`
                </div>
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <label className="block text-sm">
                예산구분
                <select
                  className="select mt-2"
                  value={form.budget_scope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      budget_scope: event.target.value as ProposalInput["budget_scope"],
                      doc_number: applyDocumentPrefix(
                        form.doc_number,
                        "proposal",
                        event.target.value as ProposalInput["budget_scope"],
                        form.submission_date,
                      ),
                    })
                  }
                >
                  {budgetScopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                비목
                <input
                  className="field mt-2"
                  value={form.budget_category}
                  onChange={(event) => setForm({ ...form, budget_category: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                세목
                <input
                  className="field mt-2"
                  value={form.budget_item}
                  onChange={(event) => setForm({ ...form, budget_item: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                지급예정일
                <input
                  className="field mt-2"
                  type="date"
                  value={form.planned_payment_date}
                  onChange={(event) => setForm({ ...form, planned_payment_date: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                지급방법
                <select
                  className="select mt-2"
                  value={form.payment_method}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      payment_method: event.target.value as ProposalInput["payment_method"],
                      evidence_checklist: buildEvidenceChecklist(
                        event.target.value as ProposalInput["payment_method"],
                        {
                          budgetItem: form.budget_item,
                          expenseCategory: form.items.map((item) => item.expense_category).join(" "),
                          vendorBusinessNumber: form.vendor_business_number,
                          vendorName: form.vendor_name,
                        },
                      ),
                    })
                  }
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                거래처명
                <input
                  className="field mt-2"
                  value={form.vendor_name}
                  onChange={(event) => setForm({ ...form, vendor_name: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                {amountLabels.vendorId}
                <input
                  className="field mt-2"
                  value={form.vendor_business_number}
                  onChange={(event) => setForm({ ...form, vendor_business_number: event.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 rounded-3xl border border-slate-200 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.requires_foundation_approval}
                  onChange={(event) =>
                    setForm({ ...form, requires_foundation_approval: event.target.checked })
                  }
                />
                재단 승인 필요
              </label>
              <label className="block text-sm">
                {amountLabels.firstAmount}
                <CurrencyInput
                  className="field mt-2"
                  value={form.supply_amount}
                  onChange={updateSupplyAmount}
                />
              </label>
              <label className="block text-sm">
                {amountLabels.secondAmount}
                <CurrencyInput
                  className="field mt-2"
                  value={form.vat_amount}
                  onChange={updateVatAmount}
                />
              </label>
              <label className="block text-sm">
                {amountLabels.thirdAmount}
                <CurrencyInput
                  className="field mt-2"
                  value={form.eligible_amount}
                  onChange={updateEligibleAmount}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                전용 또는 특이사항
                <input
                  className="field mt-2"
                  value={form.transfer_note}
                  onChange={(event) => setForm({ ...form, transfer_note: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {amountMode === "withholding" ? (
                <div>인건비·강사비·기타소득은 `실지급액 + 원천징수액 = 지급총액(세전)` 기준으로 입력합니다.</div>
              ) : (
                <div>물품구매·용역비는 `공급가액 + 세액 = 집행인정금액` 기준으로 입력합니다.</div>
              )}
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">비목</th>
                    <th className="px-3 py-3">적요</th>
                    <th className="px-3 py-3">예정금액</th>
                    <th className="px-3 py-3">산출근거</th>
                    <th className="px-3 py-3">비고</th>
                    <th className="px-3 py-3">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.expense_category}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], expense_category: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.description}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], description: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CurrencyInput
                          className="field"
                          value={item.estimated_amount}
                          onChange={(value) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], estimated_amount: value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.calculation_basis}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], calculation_basis: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.note}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], note: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          className="btn btn-danger !px-3 !py-2"
                          onClick={() =>
                            setForm({
                              ...form,
                              items: form.items.length === 1 ? [emptyItem()] : form.items.filter((_, i) => i !== index),
                            })
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button className="btn btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>
                행 추가
              </button>
              <div className="text-sm font-semibold text-slate-700">합계 {formatCurrency(totalAmount)}원</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                관련 계획서 및 집행사유
                <textarea
                  className="textarea mt-2"
                  value={form.related_plan}
                  onChange={(event) => setForm({ ...form, related_plan: event.target.value })}
                />
              </label>
              <div className="space-y-4">
                <label className="block text-sm">
                  단체명
                  <input
                    className="field mt-2"
                    value={form.org_name}
                    onChange={(event) => setForm({ ...form, org_name: event.target.value })}
                  />
                </label>
                {warnings.length ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="font-semibold">확인할 항목</div>
                    <ul className="mt-2 space-y-1">
                      {warnings.map((warning) => (
                        <li key={warning}>- {warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <EvidenceChecklistSelector
                title="예상 증빙 체크리스트"
                description="최종 결의서와 정산 단계에서 필요한 기본 증빙을 미리 선택합니다."
                selected={displayEvidenceChecklist}
                onToggle={toggleChecklist}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => save("draft")}>
                임시저장
              </button>
              <button className="btn btn-primary" onClick={() => save("finalized")}>
                저장 완료
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
