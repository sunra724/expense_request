create table if not exists proposals (
  id bigint generated always as identity primary key,
  doc_number text default '',
  fund_type text not null default 'grant',
  project_name text default '',
  project_period text default '',
  total_amount integer default 0,
  related_plan text default '',
  org_name text default '협동조합 soilab',
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
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stamp_settings (
  id integer primary key default 1,
  staff_name text default '담당자',
  manager_name text default '실장',
  chairperson_name text default '이사장',
  staff_stamp text default '/stamps/staff.png',
  manager_stamp text default '/stamps/manager.png',
  chairperson_stamp text default '/stamps/chairperson.png',
  org_name text default '협동조합 soilab',
  updated_at timestamptz not null default now()
);

insert into stamp_settings (id) values (1)
on conflict (id) do nothing;
