import { listExpenditures } from "@/lib/db/expenditures";
import { listProjects } from "@/lib/db/organizations";
import { listProposals } from "@/lib/db/proposals";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import type {
  BudgetCategory,
  DadareumDashboard,
  DadareumDashboardAlert,
  DadareumDashboardBudgetRow,
  DadareumDashboardYouthRow,
  DadareumProjectSettings,
  Expenditure,
  ExpenditureYouthAllocation,
  ExpenditureYouthAllocationInput,
  Project,
  ProjectBudgetLine,
  ProjectBudgetLineInput,
  ProjectBudgetSetup,
  ProjectYouth,
  ProjectYouthInput,
} from "@/lib/types";

const DEFAULT_MAIN_LIMIT = 2400000;
const DEFAULT_RELIEF_LIMIT = 1200000;
let memoryYouthId = 1;
let memoryAllocationId = 1;
let memoryYouths: ProjectYouth[] = [];
let memoryAllocations: ExpenditureYouthAllocation[] = [];

const now = () => new Date().toISOString();

function asNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function defaultSettings(project: Project | null): DadareumProjectSettings {
  const directBudgetTotal = project?.direct_budget_total ?? 0;
  const indirectBudgetTotal = project?.indirect_budget_total ?? 0;
  const budgetTotal = directBudgetTotal + indirectBudgetTotal;

  return {
    project_id: project?.id ?? 0,
    operating_year: 2026,
    funding_agency: "청년재단",
    settlement_form_code: "form16",
    agreed_budget_total: budgetTotal,
    revised_budget_total: budgetTotal,
    execution_budget_total: budgetTotal,
    direct_budget_total: directBudgetTotal,
    indirect_budget_total: indirectBudgetTotal,
    per_youth_main_limit: DEFAULT_MAIN_LIMIT,
    per_youth_relief_limit: DEFAULT_RELIEF_LIMIT,
    max_youth_count: 20,
    promotion_ratio_limit: 0.1,
    business_promotion_ratio_limit: 0.05,
    settlement_started_on: project?.starts_on ?? "",
    settlement_closed_on: project?.ends_on ?? "",
    notes: "",
    created_at: "",
    updated_at: "",
  };
}

function normalizeSettings(row: Record<string, unknown>, project: Project | null): DadareumProjectSettings {
  const fallback = defaultSettings(project);

  return {
    ...fallback,
    project_id: asNumber(row.project_id) || fallback.project_id,
    operating_year: asNumber(row.operating_year) || fallback.operating_year,
    funding_agency: asText(row.funding_agency) || fallback.funding_agency,
    settlement_form_code: asText(row.settlement_form_code) || fallback.settlement_form_code,
    agreed_budget_total: asNumber(row.agreed_budget_total),
    revised_budget_total: asNumber(row.revised_budget_total),
    execution_budget_total: asNumber(row.execution_budget_total),
    direct_budget_total: asNumber(row.direct_budget_total),
    indirect_budget_total: asNumber(row.indirect_budget_total),
    per_youth_main_limit: asNumber(row.per_youth_main_limit) || fallback.per_youth_main_limit,
    per_youth_relief_limit: asNumber(row.per_youth_relief_limit) || fallback.per_youth_relief_limit,
    max_youth_count: asNumber(row.max_youth_count) || fallback.max_youth_count,
    promotion_ratio_limit: Number(row.promotion_ratio_limit ?? fallback.promotion_ratio_limit),
    business_promotion_ratio_limit: Number(
      row.business_promotion_ratio_limit ?? fallback.business_promotion_ratio_limit,
    ),
    settlement_started_on: asText(row.settlement_started_on) || fallback.settlement_started_on,
    settlement_closed_on: asText(row.settlement_closed_on) || fallback.settlement_closed_on,
    notes: asText(row.notes),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
}

function normalizeBudgetCategory(row: Record<string, unknown>): BudgetCategory {
  return {
    id: asNumber(row.id),
    guideline_code: asText(row.guideline_code) || "youth-dadareum-2026",
    code: asText(row.code),
    name: asText(row.name),
    budget_scope: row.budget_scope === "indirect" ? "indirect" : "direct",
    level: [1, 2, 3].includes(asNumber(row.level)) ? (asNumber(row.level) as 1 | 2 | 3) : 3,
    parent_id: row.parent_id == null ? null : asNumber(row.parent_id),
    requires_youth_allocation: asBoolean(row.requires_youth_allocation),
    reimbursable_to_youth: asBoolean(row.reimbursable_to_youth),
    unit_limit_amount: row.unit_limit_amount == null ? null : asNumber(row.unit_limit_amount),
    unit_limit_basis: asText(row.unit_limit_basis),
    ratio_rule_key: asText(row.ratio_rule_key),
    sort_order: asNumber(row.sort_order),
    is_active: row.is_active == null ? true : asBoolean(row.is_active),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
}

function normalizeBudgetLine(row: Record<string, unknown>): ProjectBudgetLine {
  return {
    id: asNumber(row.id),
    project_id: asNumber(row.project_id),
    budget_category_id: asNumber(row.budget_category_id),
    agreed_amount: asNumber(row.agreed_amount),
    revised_amount: asNumber(row.revised_amount),
    execution_budget_amount: asNumber(row.execution_budget_amount),
    notes: asText(row.notes),
    sort_order: asNumber(row.sort_order),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
}

function normalizeYouth(row: Record<string, unknown>): ProjectYouth {
  const status = row.status === "withdrawn" || row.status === "completed" ? row.status : "active";

  return {
    id: asNumber(row.id),
    project_id: asNumber(row.project_id),
    serial_no: asNumber(row.serial_no),
    display_name: asText(row.display_name),
    enrolled_on: asText(row.enrolled_on),
    withdrawn_on: asText(row.withdrawn_on),
    withdrawal_reason: asText(row.withdrawal_reason),
    status,
    notes: asText(row.notes),
    deleted_at: asText(row.deleted_at),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
}

function normalizeAllocation(row: Record<string, unknown>): ExpenditureYouthAllocation {
  return {
    id: asNumber(row.id),
    expenditure_id: asNumber(row.expenditure_id),
    youth_id: asNumber(row.youth_id),
    allocation_kind: row.allocation_kind === "relief" ? "relief" : "main",
    allocated_amount: asNumber(row.allocated_amount),
    allocation_note: asText(row.allocation_note),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
}

async function fetchProjectSettings(project: Project | null) {
  if (!project || !hasSupabaseEnv()) return defaultSettings(project);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("dadareum_project_settings")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();
    if (error || !data) return defaultSettings(project);
    return normalizeSettings(data, project);
  } catch {
    return defaultSettings(project);
  }
}

async function fetchBudgetCategories(guidelineCode: string) {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("guideline_code", guidelineCode)
      .eq("is_active", true);
    if (error) throw error;
    return (data ?? [])
      .map((row) => normalizeBudgetCategory(row))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
  } catch {
    return [];
  }
}

async function fetchProjectBudgetLines(projectId: number) {
  if (!projectId || !hasSupabaseEnv()) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_budget_lines")
      .select("*")
      .eq("project_id", projectId);
    if (error) throw error;
    return (data ?? [])
      .map((row) => normalizeBudgetLine(row))
      .sort((a, b) => a.sort_order - b.sort_order || a.budget_category_id - b.budget_category_id);
  } catch {
    return [];
  }
}

export async function getProjectBudgetSetup(projectId?: number | null): Promise<ProjectBudgetSetup> {
  const projects = await listProjects();
  const project =
    projects.find((item) => item.id === projectId) ??
    projects.find((item) => item.guideline_code === "youth-dadareum-2026") ??
    projects[0] ??
    null;

  const [settings, categories, lines] = await Promise.all([
    fetchProjectSettings(project),
    fetchBudgetCategories(project?.guideline_code ?? "youth-dadareum-2026"),
    fetchProjectBudgetLines(project?.id ?? 0),
  ]);

  return { project, settings, categories, lines };
}

function calculateRootBudgetTotal(
  categories: BudgetCategory[],
  lines: ProjectBudgetLineInput[],
  scope: BudgetCategory["budget_scope"],
  fallback: number,
) {
  const root = categories.find((category) => category.level === 1 && category.budget_scope === scope);
  const rootLine = root ? lines.find((line) => line.budget_category_id === root.id) : null;
  return rootLine?.execution_budget_amount ?? rootLine?.revised_amount ?? rootLine?.agreed_amount ?? fallback;
}

export async function saveProjectBudgetLines(
  projectId: number,
  inputs: ProjectBudgetLineInput[],
): Promise<ProjectBudgetSetup> {
  const setup = await getProjectBudgetSetup(projectId);
  if (!setup.project) return setup;

  const categories = setup.categories;
  const normalized = inputs
    .filter((line) => line.budget_category_id)
    .map((line) => ({
      project_id: setup.project!.id,
      budget_category_id: line.budget_category_id,
      agreed_amount: Math.max(Number(line.agreed_amount || 0), 0),
      revised_amount: Math.max(Number(line.revised_amount || 0), 0),
      execution_budget_amount: Math.max(Number(line.execution_budget_amount || 0), 0),
      notes: line.notes || "",
      sort_order: Number(line.sort_order || 0),
      updated_at: now(),
    }));

  const directBudgetTotal = calculateRootBudgetTotal(
    categories,
    normalized,
    "direct",
    setup.settings.direct_budget_total || setup.project.direct_budget_total,
  );
  const indirectBudgetTotal = calculateRootBudgetTotal(
    categories,
    normalized,
    "indirect",
    setup.settings.indirect_budget_total || setup.project.indirect_budget_total,
  );
  const totalBudget = directBudgetTotal + indirectBudgetTotal;

  if (!hasSupabaseEnv()) {
    return {
      ...setup,
      settings: {
        ...setup.settings,
        agreed_budget_total: totalBudget,
        revised_budget_total: totalBudget,
        execution_budget_total: totalBudget,
        direct_budget_total: directBudgetTotal,
        indirect_budget_total: indirectBudgetTotal,
      },
      lines: normalized.map((line, index) => ({
        id: index + 1,
        project_id: line.project_id,
        budget_category_id: line.budget_category_id,
        agreed_amount: line.agreed_amount,
        revised_amount: line.revised_amount,
        execution_budget_amount: line.execution_budget_amount,
        notes: line.notes,
        sort_order: line.sort_order,
        created_at: now(),
        updated_at: line.updated_at,
      })),
    };
  }

  const supabase = getSupabaseAdmin();
  if (normalized.length) {
    const { error } = await supabase
      .from("project_budget_lines")
      .upsert(normalized, { onConflict: "project_id,budget_category_id" });
    if (error) throw error;
  }

  await supabase
    .from("projects")
    .update({
      direct_budget_total: directBudgetTotal,
      indirect_budget_total: indirectBudgetTotal,
      updated_at: now(),
    })
    .eq("id", setup.project.id);

  await supabase.from("dadareum_project_settings").upsert(
    {
      project_id: setup.project.id,
      agreed_budget_total: totalBudget,
      revised_budget_total: totalBudget,
      execution_budget_total: totalBudget,
      direct_budget_total: directBudgetTotal,
      indirect_budget_total: indirectBudgetTotal,
      updated_at: now(),
    },
    { onConflict: "project_id" },
  );

  return getProjectBudgetSetup(setup.project.id);
}

async function fetchProjectYouths(projectId: number) {
  return listProjectYouths(projectId);
}

export async function listProjectYouths(projectId: number): Promise<ProjectYouth[]> {
  if (!projectId) return [];
  if (!hasSupabaseEnv()) {
    return memoryYouths
      .filter((youth) => youth.project_id === projectId && !youth.deleted_at)
      .sort((a, b) => a.serial_no - b.serial_no);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_youths")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("serial_no");
    if (error) throw error;
    return (data ?? []).map((row) => normalizeYouth(row));
  } catch {
    return memoryYouths
      .filter((youth) => youth.project_id === projectId && !youth.deleted_at)
      .sort((a, b) => a.serial_no - b.serial_no);
  }
}

async function fetchYouthAllocations() {
  if (!hasSupabaseEnv()) return memoryAllocations.slice();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("expenditure_youth_allocations").select("*");
    if (error) throw error;
    return (data ?? []).map((row) => normalizeAllocation(row));
  } catch {
    return memoryAllocations.slice();
  }
}

export async function createProjectYouth(input: ProjectYouthInput): Promise<ProjectYouth> {
  if (!hasSupabaseEnv()) {
    const created: ProjectYouth = {
      ...input,
      id: memoryYouthId++,
      deleted_at: "",
      created_at: now(),
      updated_at: now(),
    };
    memoryYouths = [...memoryYouths, created];
    return created;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_youths")
      .insert({
        project_id: input.project_id,
        serial_no: input.serial_no,
        display_name: input.display_name,
        enrolled_on: input.enrolled_on || null,
        withdrawn_on: input.withdrawn_on || null,
        withdrawal_reason: input.withdrawal_reason,
        status: input.status,
        notes: input.notes,
      })
      .select("*")
      .single();
    if (error) throw error;
    return normalizeYouth(data);
  } catch {
    return createProjectYouthMemory(input);
  }
}

function createProjectYouthMemory(input: ProjectYouthInput): ProjectYouth {
  const created: ProjectYouth = {
    ...input,
    id: memoryYouthId++,
    deleted_at: "",
    created_at: now(),
    updated_at: now(),
  };
  memoryYouths = [...memoryYouths, created];
  return created;
}

export async function updateProjectYouth(id: number, input: ProjectYouthInput): Promise<ProjectYouth | null> {
  if (!hasSupabaseEnv()) return updateProjectYouthMemory(id, input);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_youths")
      .update({
        project_id: input.project_id,
        serial_no: input.serial_no,
        display_name: input.display_name,
        enrolled_on: input.enrolled_on || null,
        withdrawn_on: input.withdrawn_on || null,
        withdrawal_reason: input.withdrawal_reason,
        status: input.status,
        notes: input.notes,
        updated_at: now(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeYouth(data);
  } catch {
    return updateProjectYouthMemory(id, input);
  }
}

function updateProjectYouthMemory(id: number, input: ProjectYouthInput): ProjectYouth | null {
  const current = memoryYouths.find((youth) => youth.id === id);
  if (!current) return null;
  const updated: ProjectYouth = { ...current, ...input, updated_at: now() };
  memoryYouths = memoryYouths.map((youth) => (youth.id === id ? updated : youth));
  return updated;
}

export async function deleteProjectYouth(id: number) {
  if (!hasSupabaseEnv()) {
    memoryYouths = memoryYouths.map((youth) => (youth.id === id ? { ...youth, deleted_at: now() } : youth));
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("project_youths")
      .update({ deleted_at: now(), updated_at: now() })
      .eq("id", id);
    if (error) throw error;
  } catch {
    memoryYouths = memoryYouths.map((youth) => (youth.id === id ? { ...youth, deleted_at: now() } : youth));
  }
}

export async function listExpenditureYouthAllocations(expenditureId: number) {
  if (!expenditureId) return [];
  if (!hasSupabaseEnv()) {
    return memoryAllocations.filter((allocation) => allocation.expenditure_id === expenditureId);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("expenditure_youth_allocations")
      .select("*")
      .eq("expenditure_id", expenditureId);
    if (error) throw error;
    return (data ?? []).map((row) => normalizeAllocation(row));
  } catch {
    return memoryAllocations.filter((allocation) => allocation.expenditure_id === expenditureId);
  }
}

export async function replaceExpenditureYouthAllocations(
  expenditureId: number,
  inputs: ExpenditureYouthAllocationInput[],
) {
  if (!expenditureId) return [];

  if (!hasSupabaseEnv()) return replaceExpenditureYouthAllocationsMemory(expenditureId, inputs);

  try {
    const supabase = getSupabaseAdmin();
    const deleteResult = await supabase
      .from("expenditure_youth_allocations")
      .delete()
      .eq("expenditure_id", expenditureId);
    if (deleteResult.error) throw deleteResult.error;

    if (!inputs.length) return [];

    const { data, error } = await supabase
      .from("expenditure_youth_allocations")
      .insert(
        inputs.map((input) => ({
          expenditure_id: expenditureId,
          youth_id: input.youth_id,
          allocation_kind: input.allocation_kind,
          allocated_amount: input.allocated_amount,
          allocation_note: input.allocation_note,
        })),
      )
      .select("*");
    if (error) throw error;
    return (data ?? []).map((row) => normalizeAllocation(row));
  } catch {
    return replaceExpenditureYouthAllocationsMemory(expenditureId, inputs);
  }
}

function replaceExpenditureYouthAllocationsMemory(
  expenditureId: number,
  inputs: ExpenditureYouthAllocationInput[],
) {
  memoryAllocations = memoryAllocations.filter((allocation) => allocation.expenditure_id !== expenditureId);
  const created = inputs.map((input) => ({
    id: memoryAllocationId++,
    expenditure_id: expenditureId,
    youth_id: input.youth_id,
    allocation_kind: input.allocation_kind,
    allocated_amount: input.allocated_amount,
    allocation_note: input.allocation_note,
    created_at: now(),
    updated_at: now(),
  }) satisfies ExpenditureYouthAllocation);
  memoryAllocations = [...memoryAllocations, ...created];
  return created;
}

function completionPendingCount(expenditure: Expenditure) {
  return expenditure.evidence_checklist.filter((key) => !expenditure.evidence_completion[key]).length;
}

function isOfficialExecution(expenditure: Expenditure) {
  return expenditure.status === "finalized";
}

function getExecutedAmount(expenditure: Expenditure) {
  return expenditure.eligible_amount || expenditure.total_amount || 0;
}

function groupBudgetRows(
  expenditures: Expenditure[],
  categories: BudgetCategory[],
  budgetLines: ProjectBudgetLine[],
): DadareumDashboardBudgetRow[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));
  const rootBudgetKeyByScope = new Map<BudgetCategory["budget_scope"], string>();
  const rows = new Map<string, DadareumDashboardBudgetRow>();

  for (const line of budgetLines) {
    const category = categoryById.get(line.budget_category_id);
    if (!category) continue;

    const key = category.code || String(line.id);
    if (category.level === 1) rootBudgetKeyByScope.set(category.budget_scope, key);
    rows.set(key, {
      key,
      scope: category.budget_scope,
      categoryName: category.name,
      itemName: category.level === 1 ? "총액" : category.code,
      budgetAmount: line.execution_budget_amount || line.revised_amount || line.agreed_amount,
      executedAmount: 0,
      remainingAmount: line.execution_budget_amount || line.revised_amount || line.agreed_amount,
      executionRate: 0,
      documentCount: 0,
    });
  }

  const addExpenditureToRow = (key: string, expenditure: Expenditure) => {
    const existing = rows.get(key);
    if (!existing) return false;

    existing.executedAmount += getExecutedAmount(expenditure);
    existing.documentCount += 1;
    existing.remainingAmount = existing.budgetAmount - existing.executedAmount;
    existing.executionRate = existing.budgetAmount
      ? Math.round((existing.executedAmount / existing.budgetAmount) * 1000) / 10
      : 0;
    rows.set(key, existing);
    return true;
  };

  const findMatchingCategory = (expenditure: Expenditure) => {
    const text = [expenditure.budget_category, expenditure.budget_item, expenditure.expense_category]
      .filter(Boolean)
      .join(" ");

    return categories
      .filter((category) => category.level > 1 && category.budget_scope === expenditure.budget_scope)
      .sort((a, b) => b.level - a.level || a.sort_order - b.sort_order)
      .find((category) => text.includes(category.name) || text.includes(category.code));
  };

  for (const expenditure of expenditures.filter(isOfficialExecution)) {
    const fallbackKey =
      [expenditure.budget_scope, expenditure.budget_category, expenditure.budget_item]
        .filter(Boolean)
        .join(" / ") || "unclassified";
    const rootKey = rootBudgetKeyByScope.get(expenditure.budget_scope);

    if (rootKey) addExpenditureToRow(rootKey, expenditure);

    const matchingCategory = findMatchingCategory(expenditure);
    const matchingKey = matchingCategory?.code;
    const targetKey =
      matchingKey && rows.has(matchingKey)
        ? matchingKey
        : rootKey
          ? ""
          : fallbackKey;
    if (!targetKey || targetKey === rootKey) continue;

    const fallbackCategory = categoryByCode.get(targetKey);
    const existing =
      rows.get(targetKey) ??
      ({
        key: targetKey,
        scope: expenditure.budget_scope,
        categoryName: fallbackCategory?.name || expenditure.budget_category || "미분류",
        itemName: fallbackCategory?.code || expenditure.budget_item || "세목 미입력",
        budgetAmount: 0,
        executedAmount: 0,
        remainingAmount: 0,
        executionRate: 0,
        documentCount: 0,
      } satisfies DadareumDashboardBudgetRow);

    existing.executedAmount += getExecutedAmount(expenditure);
    existing.documentCount += 1;
    existing.remainingAmount = existing.budgetAmount - existing.executedAmount;
    existing.executionRate = existing.budgetAmount
      ? Math.round((existing.executedAmount / existing.budgetAmount) * 1000) / 10
      : 0;
    rows.set(targetKey, existing);
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.categoryName.localeCompare(b.categoryName, "ko");
  });
}

function groupYouthRows(
  youths: ProjectYouth[],
  allocations: ExpenditureYouthAllocation[],
  expenditures: Expenditure[],
  settings: DadareumProjectSettings,
): DadareumDashboardYouthRow[] {
  const officialExpenditureIds = new Set(expenditures.filter(isOfficialExecution).map((item) => item.id));
  const allocationByYouth = new Map<number, ExpenditureYouthAllocation[]>();

  for (const allocation of allocations.filter((item) => officialExpenditureIds.has(item.expenditure_id))) {
    allocationByYouth.set(allocation.youth_id, [...(allocationByYouth.get(allocation.youth_id) ?? []), allocation]);
  }

  const rows = youths
    .filter((youth) => !youth.deleted_at)
    .map((youth) => {
      const youthAllocations = allocationByYouth.get(youth.id) ?? [];
      const mainUsed = youthAllocations
        .filter((allocation) => allocation.allocation_kind === "main")
        .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
      const reliefUsed = youthAllocations
        .filter((allocation) => allocation.allocation_kind === "relief")
        .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);

      return {
        youthId: youth.id,
        serialNo: youth.serial_no,
        name: youth.display_name,
        status: youth.status,
        mainUsed,
        mainRemaining: settings.per_youth_main_limit - mainUsed,
        reliefUsed,
        reliefRemaining: settings.per_youth_relief_limit - reliefUsed,
        documentCount: new Set(youthAllocations.map((allocation) => allocation.expenditure_id)).size,
      } satisfies DadareumDashboardYouthRow;
    });

  if (rows.length) return rows.sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));

  const directExecuted = expenditures
    .filter((item) => isOfficialExecution(item) && item.budget_scope === "direct")
    .reduce((sum, item) => sum + getExecutedAmount(item), 0);

  return directExecuted
    ? [
        {
          youthId: null,
          serialNo: null,
          name: "청년 배정 전 직접비",
          status: "unassigned",
          mainUsed: directExecuted,
          mainRemaining: 0,
          reliefUsed: 0,
          reliefRemaining: 0,
          documentCount: expenditures.filter((item) => isOfficialExecution(item) && item.budget_scope === "direct")
            .length,
        },
      ]
    : [];
}

function buildAlerts(
  project: Project | null,
  settings: DadareumProjectSettings,
  expenditures: Expenditure[],
  youthRows: DadareumDashboardYouthRow[],
): DadareumDashboardAlert[] {
  const alerts: DadareumDashboardAlert[] = [];
  const pendingEvidence = expenditures.filter((item) => completionPendingCount(item) > 0);
  const directWithoutYouth = youthRows.length === 1 && youthRows[0]?.status === "unassigned";

  if (!project) {
    alerts.push({
      id: "project-missing",
      title: "사업 정보가 없습니다",
      description: "청년 다다름 사업 프로젝트를 먼저 등록해야 합니다.",
      severity: "blocking",
    });
  }

  if (directWithoutYouth) {
    alerts.push({
      id: "youth-allocation-missing",
      title: "청년별 안분이 아직 없습니다",
      description: "직접비 지출을 청년별 한도에 연결해야 240만원 잔액을 계산할 수 있습니다.",
      severity: "warning",
      href: "/youths",
    });
  }

  if (pendingEvidence.length) {
    alerts.push({
      id: "evidence-pending",
      title: "증빙 체크가 남아 있습니다",
      description: `${pendingEvidence.length}건의 결의서에 미완료 증빙 항목이 있습니다.`,
      severity: "warning",
      href: "/expenditures",
    });
  }

  const overLimitYouth = youthRows.filter(
    (row) => row.status !== "unassigned" && (row.mainRemaining < 0 || row.reliefRemaining < 0),
  );
  if (overLimitYouth.length) {
    alerts.push({
      id: "youth-limit-over",
      title: "청년별 한도 초과",
      description: `${overLimitYouth.length}명의 청년이 설정된 집행 한도를 넘었습니다.`,
      severity: "blocking",
    });
  }

  const directExecuted = expenditures
    .filter((item) => isOfficialExecution(item) && item.budget_scope === "direct")
    .reduce((sum, item) => sum + getExecutedAmount(item), 0);
  if (settings.direct_budget_total && directExecuted > settings.direct_budget_total) {
    alerts.push({
      id: "direct-budget-over",
      title: "직접비 예산 초과",
      description: "직접비 집행 인정금액이 직접비 예산을 초과했습니다.",
      severity: "blocking",
    });
  }

  return alerts;
}

export async function getDadareumDashboard(projectId?: number | null): Promise<DadareumDashboard> {
  const projects = await listProjects();
  const project =
    projects.find((item) => item.id === projectId) ??
    projects.find((item) => item.guideline_code === "youth-dadareum-2026") ??
    projects[0] ??
    null;
  const selectedProjectId = project?.id ?? 0;

  const [settings, proposals, allExpenditures, categories, budgetLines, youths, allocations] =
    await Promise.all([
      fetchProjectSettings(project),
      listProposals(),
      listExpenditures(),
      fetchBudgetCategories(project?.guideline_code ?? "youth-dadareum-2026"),
      fetchProjectBudgetLines(selectedProjectId),
      fetchProjectYouths(selectedProjectId),
      fetchYouthAllocations(),
    ]);

  const expenditures = allExpenditures.filter((item) =>
    selectedProjectId ? item.project_id === selectedProjectId : true,
  );
  const projectProposals = proposals.filter((item) =>
    selectedProjectId ? item.project_id === selectedProjectId : true,
  );

  const directExecutedTotal = expenditures
    .filter((item) => isOfficialExecution(item) && item.budget_scope === "direct")
    .reduce((sum, item) => sum + getExecutedAmount(item), 0);
  const indirectExecutedTotal = expenditures
    .filter((item) => isOfficialExecution(item) && item.budget_scope === "indirect")
    .reduce((sum, item) => sum + getExecutedAmount(item), 0);
  const draftPlannedTotal = expenditures
    .filter((item) => !isOfficialExecution(item))
    .reduce((sum, item) => sum + getExecutedAmount(item), 0);
  const evidencePendingCount = expenditures.filter((item) => completionPendingCount(item) > 0).length;
  const approvalPendingCount = projectProposals.filter((item) => item.requires_foundation_approval).length;

  const budgetRows = groupBudgetRows(expenditures, categories, budgetLines);
  const youthRows = groupYouthRows(youths, allocations, expenditures, settings);
  const alerts = buildAlerts(project, settings, expenditures, youthRows);

  return {
    project,
    settings,
    generatedAt: new Date().toISOString(),
    totals: {
      budgetTotal: settings.execution_budget_total || settings.direct_budget_total + settings.indirect_budget_total,
      directBudgetTotal: settings.direct_budget_total,
      indirectBudgetTotal: settings.indirect_budget_total,
      executedTotal: directExecutedTotal + indirectExecutedTotal,
      directExecutedTotal,
      indirectExecutedTotal,
      draftPlannedTotal,
      proposalTotal: projectProposals.reduce((sum, item) => sum + item.total_amount, 0),
      evidencePendingCount,
      approvalPendingCount,
      disallowedTotal: 0,
    },
    budgetRows,
    youthRows,
    alerts,
  };
}
