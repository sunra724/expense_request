create table if not exists proposals (
  id bigint generated always as identity primary key,
  doc_number text default '',
  fund_type text not null default 'grant',
  project_name text default '',
  project_period text default '',
  total_amount integer default 0,
  related_plan text default '',
  org_name text default '협동조합 소이랩',
  submission_date date,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_fund_type_check check (fund_type in ('grant', 'self', 'both')),
  constraint proposals_status_check check (status in ('draft', 'finalized'))
);

create table if not exists expenditures (
  id bigint generated always as identity primary key,
  proposal_id bigint references proposals(id) on delete set null,
  doc_number text default '',
  project_name text default '',
  expense_category text default '',
  issue_date date,
  record_date date,
  total_amount integer default 0,
  payee_address text default '',
  payee_company text default '',
  payee_name text default '',
  payment_method text default '계좌이체',
  receipt_date date,
  receipt_name text default '',
  items jsonb not null default '[]'::jsonb,
  evidence_sheet jsonb not null default '{"title":"증빙서류 첨부철","submission_note":"","items":[]}'::jsonb,
  photo_sheet jsonb not null default '{"title":"증빙사진 첨부철","submission_note":"","items":[]}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table expenditures
add column if not exists evidence_sheet jsonb not null default '{"title":"증빙서류 첨부철","submission_note":"","items":[]}'::jsonb;

alter table expenditures
add column if not exists photo_sheet jsonb not null default '{"title":"증빙사진 첨부철","submission_note":"","items":[]}'::jsonb;

create table if not exists stamp_settings (
  id integer primary key default 1,
  staff_name text default '이형구',
  manager_name text default '실장',
  chairperson_name text default '강아름',
  staff_stamp text default '/stamps/lee-hyunggu.png',
  manager_stamp text default '/stamps/manager.png',
  chairperson_stamp text default '/stamps/kang-areum.png',
  org_name text default '협동조합 소이랩',
  updated_at timestamptz not null default now()
);

insert into stamp_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists organizations (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  business_account_note text not null default '',
  direct_cost_account_note text not null default '',
  indirect_cost_account_note text not null default '',
  default_template_code text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id bigint generated always as identity primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  starts_on date,
  ends_on date,
  guideline_code text not null default 'youth-dadareum-2026',
  direct_budget_total integer not null default 0,
  indirect_budget_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists proposal_guideline_meta (
  proposal_id bigint primary key references proposals(id) on delete cascade,
  organization_id bigint references organizations(id) on delete set null,
  project_id bigint references projects(id) on delete set null,
  template_code text not null default 'default',
  budget_scope text not null default 'direct',
  budget_category text not null default '',
  budget_item text not null default '',
  planned_payment_date date,
  payment_method text not null default 'account_transfer',
  vendor_name text not null default '',
  vendor_business_number text not null default '',
  supply_amount integer not null default 0,
  vat_amount integer not null default 0,
  eligible_amount integer not null default 0,
  evidence_checklist jsonb not null default '[]'::jsonb,
  transfer_note text not null default '',
  requires_foundation_approval boolean not null default false,
  compliance_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_guideline_meta_budget_scope_check
    check (budget_scope in ('direct', 'indirect'))
);

create table if not exists expenditure_guideline_meta (
  expenditure_id bigint primary key references expenditures(id) on delete cascade,
  organization_id bigint references organizations(id) on delete set null,
  project_id bigint references projects(id) on delete set null,
  template_code text not null default 'default',
  budget_scope text not null default 'direct',
  budget_category text not null default '',
  budget_item text not null default '',
  payment_method text not null default 'account_transfer',
  vendor_business_number text not null default '',
  evidence_type text not null default 'card_payment',
  supply_amount integer not null default 0,
  vat_amount integer not null default 0,
  eligible_amount integer not null default 0,
  attendee_count integer not null default 0,
  unit_amount integer not null default 0,
  evidence_checklist jsonb not null default '[]'::jsonb,
  evidence_completion jsonb not null default '{}'::jsonb,
  compliance_flags jsonb not null default '[]'::jsonb,
  vat_excluded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenditure_guideline_meta_budget_scope_check
    check (budget_scope in ('direct', 'indirect')),
  constraint expenditure_guideline_meta_evidence_type_check
    check (evidence_type in ('tax_invoice', 'card_payment', 'youth_transfer', 'other'))
);

insert into organizations (slug, name, business_account_note, direct_cost_account_note, indirect_cost_account_note)
values (
  'youth-foundation',
  '청년재단',
  '지원기관 기준 사업비 관리',
  '직접비 기준 확인',
  '간접비 기준 확인'
)
on conflict (slug) do nothing;

insert into projects (organization_id, code, name, starts_on, ends_on, direct_budget_total, indirect_budget_total)
select id, 'dadareum-2026', '2026 청년다다름사업', '2026-01-01', '2026-12-31', 48000000, 31500000
from organizations
where slug = 'youth-foundation'
on conflict (organization_id, code) do update
set name = excluded.name,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    direct_budget_total = excluded.direct_budget_total,
    indirect_budget_total = excluded.indirect_budget_total,
    updated_at = now();

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

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenditure_guideline_meta_recipient_type_check') then
    alter table expenditure_guideline_meta
    add constraint expenditure_guideline_meta_recipient_type_check
    check (recipient_type in ('vendor', 'youth', 'staff', 'agency', 'other'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'expenditure_guideline_meta_settlement_status_check') then
    alter table expenditure_guideline_meta
    add constraint expenditure_guideline_meta_settlement_status_check
    check (settlement_status in ('draft', 'evidence_pending', 'ready', 'completed', 'disallowed', 'refunded'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'proposal_guideline_meta_foundation_approval_state_check') then
    alter table proposal_guideline_meta
    add constraint proposal_guideline_meta_foundation_approval_state_check
    check (foundation_approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'expenditure_guideline_meta_foundation_approval_state_check') then
    alter table expenditure_guideline_meta
    add constraint expenditure_guideline_meta_foundation_approval_state_check
    check (foundation_approval_state in ('not_required', 'required', 'pending', 'approved', 'rejected'));
  end if;
end $$;

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
  direct_budget_total + indirect_budget_total,
  direct_budget_total + indirect_budget_total,
  direct_budget_total + indirect_budget_total,
  direct_budget_total,
  indirect_budget_total,
  '총 사업비 79,500,000원 = 직접사업비 48,000,000원(20명 x 2,400,000원) + 간접사업비 31,500,000원(선금 22,050,000원, 잔금 9,450,000원).'
from projects
where guideline_code = 'youth-dadareum-2026'
on conflict (project_id) do update
set agreed_budget_total = excluded.agreed_budget_total,
    revised_budget_total = excluded.revised_budget_total,
    execution_budget_total = excluded.execution_budget_total,
    direct_budget_total = excluded.direct_budget_total,
    indirect_budget_total = excluded.indirect_budget_total,
    notes = excluded.notes,
    updated_at = now();

insert into budget_categories (guideline_code, code, name, budget_scope, level, sort_order)
values
  ('youth-dadareum-2026', 'DIRECT', '직접비', 'direct', 1, 10),
  ('youth-dadareum-2026', 'INDIRECT', '간접비', 'indirect', 1, 20)
on conflict (guideline_code, code) do update
set name = excluded.name,
    budget_scope = excluded.budget_scope,
    level = excluded.level,
    sort_order = excluded.sort_order;

insert into budget_categories (guideline_code, code, name, budget_scope, level, parent_id, sort_order)
select 'youth-dadareum-2026', seed.code, seed.name, seed.budget_scope, seed.level, parent.id, seed.sort_order
from (
  values
    ('DIRECT.MAKER', '제작소특화프로그램', 'direct', 2, 'DIRECT', 110),
    ('DIRECT.SELF', '자기발견', 'direct', 2, 'DIRECT', 120),
    ('DIRECT.INDEP', '자립지원', 'direct', 2, 'DIRECT', 130),
    ('INDIRECT.PAY', '보수', 'indirect', 2, 'INDIRECT', 210),
    ('INDIRECT.OPS', '일반운영비', 'indirect', 2, 'INDIRECT', 220),
    ('INDIRECT.BIZ', '업무추진비', 'indirect', 2, 'INDIRECT', 230)
) as seed(code, name, budget_scope, level, parent_code, sort_order)
join budget_categories parent
  on parent.guideline_code = 'youth-dadareum-2026'
 and parent.code = seed.parent_code
on conflict (guideline_code, code) do update
set name = excluded.name,
    budget_scope = excluded.budget_scope,
    level = excluded.level,
    parent_id = excluded.parent_id,
    sort_order = excluded.sort_order;

insert into budget_categories (
  guideline_code,
  code,
  name,
  budget_scope,
  level,
  parent_id,
  requires_youth_allocation,
  reimbursable_to_youth,
  unit_limit_amount,
  unit_limit_basis,
  ratio_rule_key,
  sort_order
)
select
  'youth-dadareum-2026',
  seed.code,
  seed.name,
  seed.budget_scope,
  3,
  parent.id,
  seed.requires_youth_allocation,
  seed.reimbursable_to_youth,
  seed.unit_limit_amount,
  seed.unit_limit_basis,
  seed.ratio_rule_key,
  seed.sort_order
from (
  values
    ('DIRECT.MAKER.MENTORING', '멘토링', 'direct', 'DIRECT.MAKER', true, false, null::integer, '', '', 111),
    ('DIRECT.MAKER.LECTURE', '강의(특강) 등', 'direct', 'DIRECT.MAKER', true, false, null::integer, '', '', 112),
    ('DIRECT.INDEP.ACADEMY', '교육훈련-학원·인터넷강의·멘토링', 'direct', 'DIRECT.INDEP', true, true, null::integer, '', '', 131),
    ('DIRECT.INDEP.EXAM', '교육훈련-자격증 응시료', 'direct', 'DIRECT.INDEP', true, true, null::integer, '', '', 132),
    ('DIRECT.SELF.MENTAL', '마음건강', 'direct', 'DIRECT.SELF', true, false, null::integer, '', '', 121),
    ('INDIRECT.PAY.SALARY', '인건비', 'indirect', 'INDIRECT.PAY', false, false, null::integer, '', '', 211),
    ('INDIRECT.OPS.PROMO', '일반수용비(홍보비)', 'indirect', 'INDIRECT.OPS', false, false, null::integer, '', 'promotion_ratio', 221),
    ('INDIRECT.OPS.MEAL', '특근매식비', 'indirect', 'INDIRECT.OPS', false, false, 10000, '원/식', '', 222),
    ('INDIRECT.BIZ.PROJECT', '사업추진비', 'indirect', 'INDIRECT.BIZ', false, false, 30000, '원/인', 'business_promotion_ratio', 231),
    ('INDIRECT.BIZ.MEETING', '회의비', 'indirect', 'INDIRECT.BIZ', false, false, 15000, '원/인', '', 232)
) as seed(
  code,
  name,
  budget_scope,
  parent_code,
  requires_youth_allocation,
  reimbursable_to_youth,
  unit_limit_amount,
  unit_limit_basis,
  ratio_rule_key,
  sort_order
)
join budget_categories parent
  on parent.guideline_code = 'youth-dadareum-2026'
 and parent.code = seed.parent_code
on conflict (guideline_code, code) do update
set name = excluded.name,
    budget_scope = excluded.budget_scope,
    level = excluded.level,
    parent_id = excluded.parent_id,
    requires_youth_allocation = excluded.requires_youth_allocation,
    reimbursable_to_youth = excluded.reimbursable_to_youth,
    unit_limit_amount = excluded.unit_limit_amount,
    unit_limit_basis = excluded.unit_limit_basis,
    ratio_rule_key = excluded.ratio_rule_key,
    sort_order = excluded.sort_order;

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
