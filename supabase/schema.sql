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
select id, 'dadareum-2026', '2026 청년다다름사업', '2026-01-01', '2026-12-31', 8000000, 2000000
from organizations
where slug = 'youth-foundation'
on conflict (organization_id, code) do nothing;
