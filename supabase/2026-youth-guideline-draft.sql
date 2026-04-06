-- Draft schema for the 2026 youth guideline refactor.
-- This file is a review artifact and is not applied automatically.

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

create table if not exists document_templates (
  id bigint generated always as identity primary key,
  organization_id bigint not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  document_kind text not null,
  theme jsonb not null default '{}'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, document_kind),
  constraint document_templates_document_kind_check
    check (document_kind in ('proposal', 'expenditure'))
);

create table if not exists project_budget_items (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  budget_scope text not null,
  budget_category text not null,
  budget_item text not null,
  approved_amount integer not null default 0,
  used_amount integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_budget_items_budget_scope_check
    check (budget_scope in ('direct', 'indirect'))
);

create table if not exists budget_transfer_logs (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  document_kind text not null,
  document_id bigint,
  from_budget_item_id bigint references project_budget_items(id) on delete set null,
  to_budget_item_id bigint references project_budget_items(id) on delete set null,
  requested_amount integer not null default 0,
  cumulative_ratio numeric(5,2) not null default 0,
  requires_foundation_approval boolean not null default false,
  approved_by text not null default '',
  approval_note text not null default '',
  created_at timestamptz not null default now(),
  constraint budget_transfer_logs_document_kind_check
    check (document_kind in ('proposal', 'expenditure'))
);

alter table proposals
add column if not exists organization_id bigint references organizations(id) on delete set null;

alter table proposals
add column if not exists project_id bigint references projects(id) on delete set null;

alter table proposals
add column if not exists template_code text not null default 'default';

alter table proposals
add column if not exists budget_scope text not null default 'direct';

alter table proposals
add column if not exists budget_category text not null default '';

alter table proposals
add column if not exists budget_item text not null default '';

alter table proposals
add column if not exists planned_payment_date date;

alter table proposals
add column if not exists payment_method text not null default 'account_transfer';

alter table proposals
add column if not exists vendor_name text not null default '';

alter table proposals
add column if not exists vendor_business_number text not null default '';

alter table proposals
add column if not exists supply_amount integer not null default 0;

alter table proposals
add column if not exists vat_amount integer not null default 0;

alter table proposals
add column if not exists eligible_amount integer not null default 0;

alter table proposals
add column if not exists evidence_checklist jsonb not null default '[]'::jsonb;

alter table proposals
add column if not exists transfer_note text not null default '';

alter table proposals
add column if not exists requires_foundation_approval boolean not null default false;

alter table proposals
add column if not exists compliance_flags jsonb not null default '[]'::jsonb;

alter table proposals
add constraint proposals_budget_scope_check
check (budget_scope in ('direct', 'indirect'));

alter table proposals
add constraint proposals_payment_method_check
check (payment_method in ('corporate_card', 'check_card', 'account_transfer', 'youth_transfer'));

alter table expenditures
add column if not exists organization_id bigint references organizations(id) on delete set null;

alter table expenditures
add column if not exists project_id bigint references projects(id) on delete set null;

alter table expenditures
add column if not exists template_code text not null default 'default';

alter table expenditures
add column if not exists budget_scope text not null default 'direct';

alter table expenditures
add column if not exists budget_category text not null default '';

alter table expenditures
add column if not exists budget_item text not null default '';

alter table expenditures
add column if not exists vendor_business_number text not null default '';

alter table expenditures
add column if not exists evidence_type text not null default 'card_payment';

alter table expenditures
add column if not exists transfer_type text not null default 'standard';

alter table expenditures
add column if not exists supply_amount integer not null default 0;

alter table expenditures
add column if not exists vat_amount integer not null default 0;

alter table expenditures
add column if not exists eligible_amount integer not null default 0;

alter table expenditures
add column if not exists attendee_count integer not null default 0;

alter table expenditures
add column if not exists unit_amount integer not null default 0;

alter table expenditures
add column if not exists evidence_checklist jsonb not null default '[]'::jsonb;

alter table expenditures
add column if not exists evidence_completion jsonb not null default '{}'::jsonb;

alter table expenditures
add column if not exists compliance_flags jsonb not null default '[]'::jsonb;

alter table expenditures
add column if not exists vat_excluded boolean not null default false;

alter table expenditures
add column if not exists transfer_log_id bigint references budget_transfer_logs(id) on delete set null;

alter table expenditures
add constraint expenditures_budget_scope_check
check (budget_scope in ('direct', 'indirect'));

alter table expenditures
add constraint expenditures_evidence_type_check
check (evidence_type in ('tax_invoice', 'card_payment', 'youth_transfer', 'other'));

alter table expenditures
add constraint expenditures_payment_method_check
check (payment_method in ('corporate_card', 'check_card', 'account_transfer', 'youth_transfer'));

create index if not exists idx_projects_organization_id on projects(organization_id);
create index if not exists idx_project_budget_items_project_id on project_budget_items(project_id);
create index if not exists idx_proposals_project_id on proposals(project_id);
create index if not exists idx_expenditures_project_id on expenditures(project_id);
