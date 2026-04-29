-- Draft schema for the youth-dadareum settlement/dashboard refactor.
-- This file is a review artifact and is not applied automatically.
-- Apply through a real migration after validating against the live Supabase schema.

create table if not exists dadareum_project_settings (
  project_id bigint primary key references projects(id) on delete cascade,
  operating_year integer not null default 2026,
  funding_agency text not null default '청년재단',
  settlement_form_code text not null default 'form16',
  agreed_budget_total integer not null default 0,
  revised_budget_total integer not null default 0,
  execution_budget_total integer not null default 0,
  direct_budget_total integer not null default 0,
  indirect_budget_total integer not null default 0,
  per_youth_main_limit integer not null default 2400000,
  per_youth_relief_limit integer not null default 1200000,
  max_youth_count integer not null default 20,
  promotion_ratio_limit numeric(6,4) not null default 0.1000,
  business_promotion_ratio_limit numeric(6,4) not null default 0.0500,
  settlement_started_on date,
  settlement_closed_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_categories (
  id bigint generated always as identity primary key,
  guideline_code text not null default 'youth-dadareum-2026',
  code text not null,
  name text not null,
  budget_scope text not null,
  level integer not null,
  parent_id bigint references budget_categories(id) on delete restrict,
  requires_youth_allocation boolean not null default false,
  reimbursable_to_youth boolean not null default false,
  unit_limit_amount integer,
  unit_limit_basis text not null default '',
  ratio_rule_key text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guideline_code, code),
  constraint budget_categories_scope_check
    check (budget_scope in ('direct', 'indirect')),
  constraint budget_categories_level_check
    check (level in (1, 2, 3))
);

create index if not exists idx_budget_categories_parent_id
  on budget_categories(parent_id);

create index if not exists idx_budget_categories_guideline_scope
  on budget_categories(guideline_code, budget_scope);

create table if not exists project_budget_lines (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  budget_category_id bigint not null references budget_categories(id) on delete restrict,
  agreed_amount integer not null default 0,
  revised_amount integer not null default 0,
  execution_budget_amount integer not null default 0,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, budget_category_id)
);

create index if not exists idx_project_budget_lines_project_id
  on project_budget_lines(project_id);

create table if not exists project_youths (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  serial_no integer not null,
  display_name text not null,
  birth_date_ciphertext text,
  phone_ciphertext text,
  email_ciphertext text,
  enrolled_on date,
  withdrawn_on date,
  withdrawal_reason text not null default '',
  status text not null default 'active',
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_youths_status_check
    check (status in ('active', 'withdrawn', 'completed'))
);

create unique index if not exists idx_project_youths_project_serial_active
  on project_youths(project_id, serial_no)
  where deleted_at is null;

create index if not exists idx_project_youths_project_id
  on project_youths(project_id);

alter table proposal_guideline_meta
add column if not exists budget_category_id bigint references budget_categories(id) on delete set null;

alter table proposal_guideline_meta
add column if not exists foundation_approval_state text not null default 'not_required';

alter table proposal_guideline_meta
add column if not exists exception_reason text not null default '';

alter table expenditure_guideline_meta
add column if not exists budget_category_id bigint references budget_categories(id) on delete set null;

alter table expenditure_guideline_meta
add column if not exists recipient_type text not null default 'vendor';

alter table expenditure_guideline_meta
add column if not exists foundation_approval_state text not null default 'not_required';

alter table expenditure_guideline_meta
add column if not exists settlement_status text not null default 'draft';

alter table expenditure_guideline_meta
add column if not exists settled_at timestamptz;

alter table expenditure_guideline_meta
add column if not exists exception_reason text not null default '';

-- Add these constraints in a real migration only after checking for existing names/data.
alter table expenditure_guideline_meta
add constraint expenditure_guideline_meta_recipient_type_check
check (recipient_type in ('vendor', 'youth', 'staff', 'agency', 'other'));

alter table expenditure_guideline_meta
add constraint expenditure_guideline_meta_settlement_status_check
check (settlement_status in ('draft', 'evidence_pending', 'ready', 'completed', 'disallowed', 'refunded'));

alter table proposal_guideline_meta
add constraint proposal_guideline_meta_foundation_approval_state_check
check (foundation_approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected'));

alter table expenditure_guideline_meta
add constraint expenditure_guideline_meta_foundation_approval_state_check
check (foundation_approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected'));

create table if not exists expenditure_youth_allocations (
  id bigint generated always as identity primary key,
  expenditure_id bigint not null references expenditures(id) on delete cascade,
  youth_id bigint not null references project_youths(id) on delete restrict,
  allocation_kind text not null default 'main',
  allocated_amount integer not null,
  allocation_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expenditure_id, youth_id, allocation_kind),
  constraint expenditure_youth_allocations_kind_check
    check (allocation_kind in ('main', 'relief')),
  constraint expenditure_youth_allocations_amount_check
    check (allocated_amount >= 0)
);

create index if not exists idx_expenditure_youth_allocations_youth_id
  on expenditure_youth_allocations(youth_id);

create table if not exists evidence_requirements (
  id bigint generated always as identity primary key,
  guideline_code text not null default 'youth-dadareum-2026',
  budget_category_id bigint references budget_categories(id) on delete cascade,
  requirement_key text not null,
  label text not null,
  applies_to_all boolean not null default false,
  payment_method text,
  recipient_type text,
  is_required boolean not null default true,
  blocks_settlement boolean not null default false,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_requirements_payment_method_check
    check (payment_method is null or payment_method in ('corporate_card', 'account_transfer')),
  constraint evidence_requirements_recipient_type_check
    check (recipient_type is null or recipient_type in ('vendor', 'youth', 'staff', 'agency', 'other'))
);

create unique index if not exists idx_evidence_requirements_unique_specific
  on evidence_requirements(
    guideline_code,
    coalesce(budget_category_id, 0),
    requirement_key,
    coalesce(payment_method, ''),
    coalesce(recipient_type, '')
  );

create table if not exists document_files (
  id bigint generated always as identity primary key,
  proposal_id bigint references proposals(id) on delete cascade,
  expenditure_id bigint references expenditures(id) on delete cascade,
  file_role text not null default 'evidence',
  storage_provider text not null default 'supabase',
  storage_bucket text not null default '',
  storage_path text not null,
  original_file_name text not null default '',
  mime_type text not null default '',
  size_bytes integer not null default 0,
  checksum text not null default '',
  uploaded_by text not null default '',
  created_at timestamptz not null default now(),
  constraint document_files_owner_check
    check (
      (proposal_id is not null and expenditure_id is null)
      or (proposal_id is null and expenditure_id is not null)
    )
);

create index if not exists idx_document_files_expenditure_id
  on document_files(expenditure_id);

create table if not exists evidence_items (
  id bigint generated always as identity primary key,
  expenditure_id bigint not null references expenditures(id) on delete cascade,
  requirement_id bigint references evidence_requirements(id) on delete set null,
  file_id bigint references document_files(id) on delete set null,
  requirement_key text not null,
  requirement_label text not null,
  is_checked boolean not null default false,
  checked_by text not null default '',
  checked_at timestamptz,
  missing_reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expenditure_id, requirement_key)
);

create index if not exists idx_evidence_items_expenditure_id
  on evidence_items(expenditure_id);

create table if not exists foundation_approvals (
  id bigint generated always as identity primary key,
  proposal_id bigint references proposals(id) on delete cascade,
  expenditure_id bigint references expenditures(id) on delete cascade,
  approval_state text not null default 'not_required',
  approval_type text not null default 'none',
  approved_at timestamptz,
  approved_by text not null default '',
  document_ref text not null default '',
  file_id bigint references document_files(id) on delete set null,
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foundation_approvals_owner_check
    check (
      (proposal_id is not null and expenditure_id is null)
      or (proposal_id is null and expenditure_id is not null)
    ),
  constraint foundation_approvals_state_check
    check (approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected')),
  constraint foundation_approvals_type_check
    check (approval_type in ('none', 'verbal', 'official_doc'))
);

create table if not exists disallowance_cases (
  id bigint generated always as identity primary key,
  expenditure_id bigint not null unique references expenditures(id) on delete cascade,
  claimed_amount integer not null default 0,
  recognized_amount integer not null default 0,
  disallowed_amount integer not null default 0,
  refund_due_amount integer not null default 0,
  refunded_amount integer not null default 0,
  refund_status text not null default 'none',
  refund_due_on date,
  refunded_on date,
  reason text not null,
  audit_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disallowance_cases_refund_status_check
    check (refund_status in ('none', 'scheduled', 'partial', 'completed')),
  constraint disallowance_cases_amount_check
    check (
      claimed_amount >= 0
      and recognized_amount >= 0
      and disallowed_amount >= 0
      and refund_due_amount >= 0
      and refunded_amount >= 0
    )
);

create table if not exists budget_transfer_logs (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  proposal_id bigint references proposals(id) on delete set null,
  expenditure_id bigint references expenditures(id) on delete set null,
  from_budget_line_id bigint references project_budget_lines(id) on delete set null,
  to_budget_line_id bigint references project_budget_lines(id) on delete set null,
  transfer_amount integer not null default 0,
  cumulative_ratio numeric(8,4) not null default 0,
  approval_state text not null default 'not_required',
  approved_at timestamptz,
  approved_by text not null default '',
  approval_document_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_transfer_logs_amount_check
    check (transfer_amount >= 0),
  constraint budget_transfer_logs_approval_state_check
    check (approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected'))
);

create table if not exists settlement_audit_logs (
  id bigint generated always as identity primary key,
  project_id bigint references projects(id) on delete set null,
  entity_type text not null,
  entity_id bigint not null,
  action text not null,
  actor text not null default '',
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_settlement_audit_logs_project_id
  on settlement_audit_logs(project_id);

-- 2026 청년다다름사업 계약 사업비 기준
-- 총 사업비 79,500,000원 = 직접사업비 48,000,000원 + 간접사업비 31,500,000원
-- 간접사업비 지급 일정: 선금 22,050,000원(70%), 잔금 9,450,000원(30%)
update projects
set direct_budget_total = 48000000,
    indirect_budget_total = 31500000,
    updated_at = now()
where code = 'dadareum-2026'
  and guideline_code = 'youth-dadareum-2026';

insert into dadareum_project_settings (
  project_id,
  operating_year,
  funding_agency,
  agreed_budget_total,
  revised_budget_total,
  execution_budget_total,
  direct_budget_total,
  indirect_budget_total,
  notes
)
select
  id,
  2026,
  '청년재단',
  79500000,
  79500000,
  79500000,
  48000000,
  31500000,
  '총 사업비 79,500,000원 = 직접사업비 48,000,000원(20명 x 2,400,000원) + 간접사업비 31,500,000원(선금 22,050,000원, 잔금 9,450,000원).'
from projects
where code = 'dadareum-2026'
  and guideline_code = 'youth-dadareum-2026'
on conflict (project_id) do update
set agreed_budget_total = excluded.agreed_budget_total,
    revised_budget_total = excluded.revised_budget_total,
    execution_budget_total = excluded.execution_budget_total,
    direct_budget_total = excluded.direct_budget_total,
    indirect_budget_total = excluded.indirect_budget_total,
    notes = excluded.notes,
    updated_at = now();

insert into project_budget_lines (
  project_id,
  budget_category_id,
  agreed_amount,
  revised_amount,
  execution_budget_amount,
  notes,
  sort_order
)
select
  project.id,
  category.id,
  seed.amount,
  seed.amount,
  seed.amount,
  seed.notes,
  seed.sort_order
from projects project
join (
  values
    ('DIRECT', 48000000, '직접사업비 총액: 20명 x 2,400,000원', 10),
    ('INDIRECT', 31500000, '간접사업비 총액: 선금 22,050,000원, 잔금 9,450,000원', 20)
) as seed(category_code, amount, notes, sort_order) on true
join budget_categories category
  on category.guideline_code = project.guideline_code
 and category.code = seed.category_code
where project.code = 'dadareum-2026'
  and project.guideline_code = 'youth-dadareum-2026'
on conflict (project_id, budget_category_id) do update
set agreed_amount = excluded.agreed_amount,
    revised_amount = excluded.revised_amount,
    execution_budget_amount = excluded.execution_budget_amount,
    notes = excluded.notes,
    sort_order = excluded.sort_order,
    updated_at = now();
