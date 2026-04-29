"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type {
  BudgetCategory,
  Project,
  ProjectBudgetLineInput,
  ProjectBudgetSetup,
} from "@/lib/types";

type ContextPayload = {
  projects: Project[];
};

type DraftBudgetLine = ProjectBudgetLineInput & {
  existing: boolean;
};

const emptySetup: ProjectBudgetSetup = {
  project: null,
  settings: {
    project_id: 0,
    operating_year: 2026,
    funding_agency: "",
    settlement_form_code: "form16",
    agreed_budget_total: 0,
    revised_budget_total: 0,
    execution_budget_total: 0,
    direct_budget_total: 0,
    indirect_budget_total: 0,
    per_youth_main_limit: 2400000,
    per_youth_relief_limit: 1200000,
    max_youth_count: 20,
    promotion_ratio_limit: 0.1,
    business_promotion_ratio_limit: 0.05,
    settlement_started_on: "",
    settlement_closed_on: "",
    notes: "",
    created_at: "",
    updated_at: "",
  },
  categories: [],
  lines: [],
};

function scopeLabel(scope: BudgetCategory["budget_scope"]) {
  return scope === "direct" ? "직접비" : "간접비";
}

function categoryLevelLabel(level: BudgetCategory["level"]) {
  if (level === 1) return "총액";
  if (level === 2) return "세목";
  return "세세목";
}

function lineHasValue(line: DraftBudgetLine) {
  return (
    line.existing ||
    line.agreed_amount > 0 ||
    line.revised_amount > 0 ||
    line.execution_budget_amount > 0 ||
    Boolean(line.notes.trim())
  );
}

function buildDrafts(setup: ProjectBudgetSetup) {
  const lineMap = new Map(setup.lines.map((line) => [line.budget_category_id, line]));

  return Object.fromEntries(
    setup.categories.map((category) => {
      const line = lineMap.get(category.id);
      return [
        category.id,
        {
          budget_category_id: category.id,
          agreed_amount: line?.agreed_amount ?? 0,
          revised_amount: line?.revised_amount ?? 0,
          execution_budget_amount: line?.execution_budget_amount ?? 0,
          notes: line?.notes ?? "",
          sort_order: line?.sort_order ?? category.sort_order,
          existing: Boolean(line),
        } satisfies DraftBudgetLine,
      ];
    }),
  );
}

export default function BudgetLineManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [setup, setSetup] = useState<ProjectBudgetSetup>(emptySetup);
  const [drafts, setDrafts] = useState<Record<number, DraftBudgetLine>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/context")
      .then((response) => response.json())
      .then((data: ContextPayload) => {
        if (!active) return;
        const nextProjects = data.projects ?? [];
        setProjects(nextProjects);
        setProjectId((current) => current ?? nextProjects.find((project) => project.code === "dadareum-2026")?.id ?? nextProjects[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setProjects([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    fetch(`/api/projects/${projectId}/budget-lines`)
      .then((response) => response.json())
      .then((data: ProjectBudgetSetup) => {
        if (!active) return;
        setSetup(data);
        setDrafts(buildDrafts(data));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const parentById = useMemo(() => new Map(setup.categories.map((category) => [category.id, category])), [setup.categories]);
  const totals = useMemo(() => {
    let directTotal = 0;
    let indirectTotal = 0;
    let directDetail = 0;
    let indirectDetail = 0;

    for (const category of setup.categories) {
      const amount = drafts[category.id]?.execution_budget_amount ?? 0;
      if (category.level === 1 && category.budget_scope === "direct") directTotal = amount;
      if (category.level === 1 && category.budget_scope === "indirect") indirectTotal = amount;
      if (category.level > 1 && category.budget_scope === "direct") directDetail += amount;
      if (category.level > 1 && category.budget_scope === "indirect") indirectDetail += amount;
    }

    return {
      directTotal,
      indirectTotal,
      total: directTotal + indirectTotal,
      directDetail,
      indirectDetail,
    };
  }, [drafts, setup.categories]);

  function updateDraft(categoryId: number, patch: Partial<DraftBudgetLine>) {
    setDrafts((current) => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        ...patch,
      },
    }));
  }

  async function save() {
    if (!projectId) return;
    setSaving(true);
    const lines = setup.categories
      .map((category) => drafts[category.id])
      .filter((line): line is DraftBudgetLine => Boolean(line))
      .filter(lineHasValue)
      .map((line) => ({
        budget_category_id: line.budget_category_id,
        agreed_amount: line.agreed_amount,
        revised_amount: line.revised_amount,
        execution_budget_amount: line.execution_budget_amount,
        notes: line.notes,
        sort_order: line.sort_order,
      }));

    const response = await fetch(`/api/projects/${projectId}/budget-lines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const data = (await response.json()) as ProjectBudgetSetup;
    setSetup(data);
    setDrafts(buildDrafts(data));
    setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Budget Workspace</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">예산관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">협약 총액과 세목별 실행예산을 정산 기준으로 관리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="select min-w-64"
            value={projectId ?? ""}
            onChange={(event) => {
              setLoading(true);
              setProjectId(Number(event.target.value));
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={saving || loading || !projectId} onClick={save}>
            <Save className="h-4 w-4" />
            {saving ? "저장 중" : "저장"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">총 사업비</div>
          <div className="mt-3 text-2xl font-semibold">{formatCurrency(totals.total)}원</div>
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">직접사업비</div>
          <div className="mt-3 text-2xl font-semibold">{formatCurrency(totals.directTotal)}원</div>
          {totals.directDetail > 0 ? (
            <div className="mt-1 text-xs text-slate-500">세부 편성 {formatCurrency(totals.directDetail)}원</div>
          ) : null}
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">간접사업비</div>
          <div className="mt-3 text-2xl font-semibold">{formatCurrency(totals.indirectTotal)}원</div>
          {totals.indirectDetail > 0 ? (
            <div className="mt-1 text-xs text-slate-500">세부 편성 {formatCurrency(totals.indirectDetail)}원</div>
          ) : null}
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">저장 상태</div>
          <div className="mt-3 text-2xl font-semibold">{savedAt || "대기"}</div>
          <div className="mt-1 text-xs text-slate-500">집행예산 기준으로 대시보드에 반영됩니다.</div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">구분</th>
                <th className="px-4 py-3">단계</th>
                <th className="px-4 py-3">예산항목</th>
                <th className="px-4 py-3 text-right">협약예산</th>
                <th className="px-4 py-3 text-right">변경예산</th>
                <th className="px-4 py-3 text-right">집행예산</th>
                <th className="px-4 py-3">메모</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    예산표를 불러오는 중입니다.
                  </td>
                </tr>
              ) : (
                setup.categories.map((category) => {
                  const draft = drafts[category.id];
                  const parent = category.parent_id ? parentById.get(category.parent_id) : null;
                  const indent = category.level === 1 ? "" : category.level === 2 ? "pl-5" : "pl-9";

                  return (
                    <tr key={category.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">{scopeLabel(category.budget_scope)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {categoryLevelLabel(category.level)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${indent}`}>
                        <div className="font-medium text-slate-900">{category.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {parent ? `${parent.name} / ` : ""}
                          {category.code}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <CurrencyInput
                          className="field text-right"
                          value={draft?.agreed_amount ?? 0}
                          onChange={(value) => updateDraft(category.id, { agreed_amount: value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <CurrencyInput
                          className="field text-right"
                          value={draft?.revised_amount ?? 0}
                          onChange={(value) => updateDraft(category.id, { revised_amount: value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <CurrencyInput
                          className="field text-right"
                          value={draft?.execution_budget_amount ?? 0}
                          onChange={(value) => updateDraft(category.id, { execution_budget_amount: value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="field min-w-60"
                          value={draft?.notes ?? ""}
                          onChange={(event) => updateDraft(category.id, { notes: event.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
