# expenserequest 청년다다름 정산 전용 스키마 설계서

> 검토/수정일: 2026-04-29  
> 대상 앱: `C:\dev\disbursement-system` / Railway `expenserequest-production`  
> 목적: 기존 지출품의서/지출결의서 생성 앱을 청년다다름사업 정산 및 대시보드 운영에 맞게 확장한다.

---

## 1. 검토 결론

Claude 초안은 방향은 좋지만, 현재 코드베이스와 맞지 않는 전제가 많다. 그대로 구현하면 중간에 크게 엉킬 가능성이 높다.

수정해야 할 핵심은 아래와 같다.

- 현재 앱은 Prisma/Drizzle 모델이 아니라 Supabase PostgreSQL SQL과 Next.js API Route를 사용한다.
- 현재 핵심 문서 테이블은 `proposals`, `expenditures`이며, 초안의 `Resolution` 엔티티는 실제 앱에는 없다. 이하 설계에서는 `Resolution` 대신 `expenditures`를 사용한다.
- 이미 `proposal_guideline_meta`, `expenditure_guideline_meta`라는 지침 메타 테이블이 있으므로, 모든 필드를 `proposals`/`expenditures` 본체에 직접 추가하지 않는다.
- 대시보드는 별도 입력 테이블이 아니라 문서, 예산, 청년 배정, 증빙 상태를 집계하는 뷰 또는 API 쿼리로 만든다.
- 주민번호 앞자리 등 민감정보는 원칙적으로 저장하지 않는다. 꼭 필요하면 암호화 컬럼으로 분리하고, 검색/집계에는 사용하지 않는다.
- 증빙 파일을 장기 보관해야 하므로 `evidence_sheet` JSONB 안의 data URL만으로 운영하지 않는다. 파일 메타와 스토리지 경로를 별도 테이블로 관리한다.

이 문서는 기존 `supabase/schema.sql`의 방향을 보존하면서, 다다름 정산 전용 기능을 안전하게 얹는 설계안이다.

---

## 2. 현재 앱 기준

현재 확인된 구조는 다음과 같다.

- 문서 본체
  - `proposals`: 지출품의서
  - `expenditures`: 지출결의서
- 지침/정산 메타
  - `proposal_guideline_meta`
  - `expenditure_guideline_meta`
- 조직/사업
  - `organizations`
  - `projects`
- 현재 타입/로직 위치
  - `lib/types.ts`
  - `lib/guideline.ts`
  - `lib/db/proposals.ts`
  - `lib/db/expenditures.ts`
  - `lib/db/guideline-metadata.ts`

따라서 신규 설계는 아래 원칙을 따른다.

1. 문서 본체 테이블은 최대한 유지한다.
2. 다다름 전용 필드는 메타 테이블과 신규 정산 테이블에 둔다.
3. 인쇄/PDF에 필요한 표시 문자열은 기존 필드나 스냅샷 필드에 남긴다.
4. 정산/대시보드에 필요한 정규화 데이터는 FK로 관리한다.

---

## 3. 목표 데이터 흐름

청년다다름 정산 업무는 아래 흐름으로 잡는다.

1. `projects`에 청년다다름사업을 만든다.
2. `dadareum_project_settings`에 사업연도, 한도, 정산 설정을 둔다.
3. `budget_categories`와 `project_budget_lines`로 비목/세목/세세목 및 예산표를 관리한다.
4. `project_youths`에 참여청년을 등록한다.
5. 지출품의서(`proposals`) 작성 시 예산 세세목과 예정 증빙을 연결한다.
6. 지출결의서(`expenditures`) 작성 시 실제 지급, 증빙, 청년별 안분, 재단 승인, 불인정 처리를 연결한다.
7. 대시보드는 위 데이터를 집계해서 다음을 보여준다.
   - 전체 집행률
   - 직접비/간접비 집행률
   - 비목/세목/세세목별 예산 대비 집행
   - 청년별 240만원 한도 사용액과 잔액
   - 증빙 미완료 문서
   - 재단 승인 필요/대기 문서
   - 불인정 및 반납 상태

---

## 4. 권장 테이블 설계

아래 DDL은 설계 기준이다. 실제 반영 시에는 별도 migration 파일로 나누어 적용한다.

### 4.1 사업별 다다름 설정

`projects` 자체에 다다름 필드를 계속 추가하지 않고, 1:1 설정 테이블을 둔다.

```sql
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
```

초기 시드 예산은 반드시 실제 협약서 기준으로 넣는다. 2026년 청년다다름사업 협약 기준 총 사업비는 79,500,000원이며, 직접사업비 48,000,000원(1인 2,400,000원 x 20명), 간접사업비 31,500,000원으로 관리한다. 간접사업비 지급 일정은 선금 22,050,000원(70%), 잔금 9,450,000원(30%)이며, 이는 예산 총액이 아니라 지급 시기 메모로 보관한다.

### 4.2 비목/세목/세세목 기준표

다다름사업의 드롭다운/정산 분류는 문자열만 저장하면 대시보드와 검증이 어려워진다. 공통 기준표를 둔다.

```sql
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
```

예시 코드:

- `DIRECT`: 직접비
- `DIRECT.MAKER`: 제작소특화프로그램
- `DIRECT.MAKER.MENTORING`: 멘토링
- `DIRECT.INDEP.EXAM`: 교육훈련-자격증 응시료
- `INDIRECT`: 간접비
- `INDIRECT.OPS.PROMO`: 일반수용비(홍보비)
- `INDIRECT.BIZ.MEETING`: 회의비

### 4.3 사업별 예산표

기준표는 분류이고, 실제 예산은 사업별로 따로 관리한다.

```sql
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
```

대시보드의 집행액은 여기에 저장하지 않고, `expenditures` + `expenditure_guideline_meta`에서 집계한다. 수동 캐시가 필요하면 나중에 materialized view를 둔다.

### 4.4 참여청년

청년별 한도 관리를 위해 필수다.

```sql
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
```

주의:

- 주민번호 앞 6자리는 기본 저장 대상에서 제외한다.
- 청년재단 제출 서식상 생년월일이 꼭 필요하면 `birth_date_ciphertext`에 암호화해서 저장한다.
- 대시보드와 한도 검증에는 `id`, `serial_no`, `display_name`만 사용한다.

### 4.5 기존 메타 테이블 확장

현재 앱의 sidecar 메타 패턴을 유지한다. 인쇄용 문자열(`budget_category`, `budget_item`)은 남기고, 정산 검증용 FK를 추가한다.

```sql
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
```

`payment_method`는 현재 코드상 `corporate_card`, `account_transfer` 중심이다. 청년 실비지급은 `payment_method='account_transfer'` + `recipient_type='youth'`로 구분하는 편이 기존 코드와 충돌이 적다.

### 4.6 청년별 지출 안분

초안의 `YouthExpenseLink`는 실제 앱 기준으로 `expenditure_youth_allocations`가 맞다.

```sql
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
```

직접비 세세목은 `budget_categories.requires_youth_allocation=true`일 때 안분 합계가 `expenditure_guideline_meta.eligible_amount`와 일치해야 한다.

### 4.7 증빙 요구사항

초안의 `EvidenceTemplate`은 `evidence_requirements`로 둔다. 카테고리, 지급방식, 수령인 유형에 따라 다른 요구사항을 표현할 수 있어야 한다.

```sql
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
```

공통 요구사항은 `applies_to_all=true`, `budget_category_id=null`로 둔다.

### 4.8 파일 메타

증빙 파일은 DB JSONB에 base64/data URL로 계속 넣으면 백업과 성능이 나빠진다. 파일은 스토리지에 두고 DB에는 메타만 저장한다.

```sql
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
```

### 4.9 실제 증빙 체크 상태

```sql
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
```

### 4.10 재단 승인

품의 또는 결의 어느 단계에서든 승인 기록을 남길 수 있어야 한다.

```sql
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
```

### 4.11 불인정/반납

초안의 `Disapproval` 금액 필드는 의미가 불명확했다. 정산에서는 청구액, 인정액, 불인정액, 반납대상액, 반납완료액을 분리해야 한다.

```sql
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
```

### 4.12 예산 전용 이력

현재 draft SQL의 `budget_transfer_logs`는 방향이 맞다. 다만 승인 상태와 연결 문서를 명확히 보강한다.

```sql
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
```

### 4.13 감사 로그

정산 시스템에서는 삭제/상태 변경/검증 강행을 추적해야 한다.

```sql
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
```

---

## 5. 대시보드 집계 설계

대시보드는 입력 테이블을 새로 만들지 않는다. 아래 집계를 API 또는 SQL view로 제공한다.

### 5.1 사업 요약

필요 값:

- 협약예산, 변경예산, 집행예산
- 총 집행 인정금액
- 직접비 집행 인정금액
- 간접비 집행 인정금액
- 증빙 미완료 건수
- 재단 승인 대기 건수
- 불인정/반납 건수와 금액

기준:

- 집행액은 `expenditure_guideline_meta.eligible_amount` 기준으로 계산한다.
- `expenditures.status='finalized'` 또는 `expenditure_guideline_meta.settlement_status in ('ready', 'completed', 'disallowed', 'refunded')`인 문서만 공식 집행액에 넣는다.
- 초안/작성중 문서는 별도 "예정 집행"으로만 보여준다.

### 5.2 비목/세세목별 집행

`project_budget_lines`를 기준으로 `expenditure_guideline_meta.budget_category_id`를 집계한다.

표시 컬럼:

- 비목
- 세목
- 세세목
- 협약예산
- 변경예산
- 집행예산
- 집행 인정금액
- 잔액
- 집행률
- 경고 라벨

### 5.3 청년별 한도

`project_youths`와 `expenditure_youth_allocations`를 집계한다.

표시 컬럼:

- 연번
- 이름
- 상태
- 주 예산 사용액
- 주 예산 잔액
- 애로사항 사용액
- 애로사항 잔액
- 한도 초과 여부
- 증빙 미완료 건수

### 5.4 증빙 상태

`evidence_items`를 기준으로 한다.

표시 컬럼:

- 결의서 번호
- 지출일
- 세세목
- 지급처/수령인
- 금액
- 필수 증빙 개수
- 완료 증빙 개수
- 차단 증빙 누락 여부
- 누락 항목명

---

## 6. 검증 규칙

검증은 세 단계로 둔다.

- DB 제약: 단순 enum, 금액 음수 방지, FK, owner check
- API 검증: 한도, 집계, 증빙 완료, 전용 비율
- UI 경고: 저장 전 안내, 대시보드 알림

### R1. 직접비는 청년 안분 필수

조건:

- `budget_categories.requires_youth_allocation=true`

검증:

- `sum(expenditure_youth_allocations.allocated_amount) = expenditure_guideline_meta.eligible_amount`

실패:

- 최종확정 또는 정산완료 차단

### R2. 청년 1인당 한도

조건:

- 안분 유형 `main`

검증:

- 청년별 누적 `allocated_amount <= dadareum_project_settings.per_youth_main_limit`

애로사항:

- 안분 유형 `relief`는 `per_youth_relief_limit` 기준

실패:

- 저장 전 경고
- 최종확정은 기본 차단
- 관리자가 강행하면 `settlement_audit_logs`에 사유 기록

### R3. 예산 초과

검증:

- 세세목별 집행 인정금액이 `project_budget_lines.execution_budget_amount`를 초과하는지 확인

실패:

- 경고
- 초과 사유 또는 전용 이력 필요

### R4. 직접비/간접비 간 전용 금지

검증:

- 전용 전후 예산 라인의 `budget_scope`가 다르면 차단

실패:

- 저장 차단

### R5. 세목 전용 누적 10% 기준

검증:

- 최초 편성예산 기준 누적 전용 비율 계산

실패:

- 10% 이상이면 재단 승인 필요 상태로 전환

### R6. 사업기간 후 집행 제한

검증:

- 결의일, 지급일, 회계기록일이 사업기간 안에 있는지 확인

예외:

- 정산 제출을 위한 우편료/인쇄비 등은 `exception_reason` 필수

### R7. 증빙 완료

검증:

- `evidence_requirements.blocks_settlement=true`인 항목이 모두 체크되었는지 확인

실패:

- `settlement_status='completed'` 전환 차단

### R8. 자격증 응시료 응시확인서

조건:

- `budget_categories.code='DIRECT.INDEP.EXAM'`

검증:

- `exam_confirmation` 체크 또는 미응시/환불 처리 증빙 존재

실패:

- 정산완료 차단

### R9. 회의비/식비 단가

조건:

- 회의비 또는 특근매식비 카테고리

검증:

- `unit_amount <= budget_categories.unit_limit_amount`

실패:

- 경고 또는 차단
- 참석자 수/회의록 누락 시 차단

### R10. 부가세 제외

검증:

- 환급 또는 공제 대상 부가세는 `eligible_amount`에서 제외

실패:

- 경고
- 최종확정 전 확인 필요

---

## 7. API 설계

현재 앱의 App Router 패턴에 맞춘다.

### 7.1 사업/대시보드

```text
GET /api/projects/[id]/dashboard
GET /api/projects/[id]/dashboard/budget-lines
GET /api/projects/[id]/dashboard/youths
GET /api/projects/[id]/validations
```

### 7.2 청년

```text
GET    /api/projects/[id]/youths
POST   /api/projects/[id]/youths
PATCH  /api/youths/[id]
DELETE /api/youths/[id]
GET    /api/youths/[id]/expenditures
```

삭제는 soft delete로 처리한다.

### 7.3 예산 분류

```text
GET /api/budget-categories?guidelineCode=youth-dadareum-2026
GET /api/projects/[id]/budget-lines
PUT /api/projects/[id]/budget-lines
```

### 7.4 결의서 확장

```text
POST   /api/expenditures/[id]/youth-allocations
PUT    /api/expenditures/[id]/youth-allocations
GET    /api/expenditures/[id]/evidence
POST   /api/expenditures/[id]/evidence
PATCH  /api/evidence-items/[id]
POST   /api/expenditures/[id]/approval
POST   /api/expenditures/[id]/disallowance
PATCH  /api/expenditures/[id]/settlement-status
```

### 7.5 출력

```text
POST /api/projects/[id]/export/form16
GET  /api/projects/[id]/export/form16/preview
```

서식16은 원본 xlsx 템플릿을 보관하고 셀 값만 주입한다. 서식, 수식, 병합 셀 보존을 위해 `exceljs` 또는 `xlsx-populate`를 검토한다.

---

## 8. UI 변경 방향

### 8.1 첫 화면은 대시보드

청년다다름 전용 운영에서는 목록 화면보다 대시보드가 첫 화면이어야 한다.

첫 화면 구성:

- 사업 선택
- 전체 집행률
- 직접비/간접비 집행률
- 청년별 잔액 요약
- 증빙 미완료
- 승인 대기
- 불인정/반납 알림

### 8.2 지출품의서

추가/강화 필드:

- 사업
- 예산구분
- 비목/세목/세세목
- 지급 예정 방식
- 재단 승인 필요 여부
- 예정 증빙
- 부가세 및 집행 인정금액

### 8.3 지출결의서

추가/강화 필드:

- 품의서 기반 자동 채움
- 실제 지급일
- 지급처/수령인 유형
- 집행 인정금액
- 청년별 안분
- 증빙 체크리스트
- 정산 상태
- 불인정/반납 상태

---

## 9. 마이그레이션 순서

### Phase 1. 스키마 기반 추가

- `dadareum_project_settings`
- `budget_categories`
- `project_budget_lines`
- `project_youths`
- `expenditure_youth_allocations`
- `evidence_requirements`
- `document_files`
- `evidence_items`
- `foundation_approvals`
- `disallowance_cases`
- `settlement_audit_logs`
- 기존 guideline meta 테이블 확장

기존 문서 작성 흐름은 그대로 유지한다.

### Phase 2. 기준 데이터 시드

- 다다름 비목/세목/세세목 시드
- 증빙 요구사항 시드
- 프로젝트 예산표 입력
- 참여청년 등록

### Phase 3. 대시보드 읽기 전용 구현

- 기존 문서와 수기 입력한 메타 기준으로 대시보드 먼저 구현
- 이 단계에서는 저장 차단보다 경고 중심

### Phase 4. 문서 작성 UI 통합

- 품의/결의서 폼에 예산분류, 청년 안분, 증빙 체크리스트 연결
- 기존 인쇄/PDF 출력은 유지

### Phase 5. 검증 차단 활성화

- 처음에는 warn-only
- 운영자가 기준을 확인한 뒤 차단 규칙 활성화
- 강행 저장은 audit log 필수

### Phase 6. 서식16 자동 생성

- 템플릿 파일 확보
- 셀 매핑표 작성
- xlsx 다운로드 API 구현

---

## 10. Claude 초안에서 폐기/수정한 항목

- `model Youth`, `model Resolution` 같은 Prisma 문법은 폐기한다.
- `Resolution` 명칭은 실제 앱의 `expenditures`로 바꾼다.
- 모든 새 필드를 `proposals`/`expenditures`에 직접 추가하는 방식은 폐기한다.
- `YouthExpenseLink`는 `expenditure_youth_allocations`로 바꾼다.
- `EvidenceTemplate`은 `evidence_requirements`, `EvidenceItem`은 `evidence_items`로 바꾼다.
- `rrnPrefix` 평문/일반 컬럼은 폐기한다. 필요한 경우 암호화 컬럼만 둔다.
- `Disapproval`의 `agencyAmount`, `auditorAmount` 구조는 폐기하고, 청구액/인정액/불인정액/반납액 구조로 바꾼다.
- 대시보드 전용 중복 테이블은 만들지 않는다. 집계 뷰/API로 시작한다.

---

## 11. 구현 체크리스트

### M1. SQL 설계 반영

- [ ] 별도 migration SQL 작성
- [ ] 기존 `supabase/2026-youth-guideline-draft.sql`을 이 문서 기준으로 갱신
- [ ] Supabase SQL Editor에서 개발 DB에 적용
- [ ] 기존 문서 CRUD 회귀 확인

### M2. 타입/DB 접근 계층

- [ ] `lib/types.ts`에 신규 타입 추가
- [ ] `lib/db/dadareum.ts` 또는 기능별 DB 모듈 추가
- [ ] `lib/guideline.ts`의 payment/evidence 타입과 새 테이블 값 정합성 맞추기

### M3. 대시보드 API

- [ ] 사업 요약 집계
- [ ] 비목별 집계
- [ ] 청년별 집계
- [ ] 증빙 미완료 집계
- [ ] 승인/불인정 알림 집계

### M4. 대시보드 UI

- [ ] `/dashboard` 또는 루트 페이지 개편
- [ ] 직접비/간접비 집행률
- [ ] 청년별 잔액
- [ ] 증빙 미완료
- [ ] 경고/차단 규칙 알림

### M5. 결의서 UI 통합

- [ ] 세세목 선택
- [ ] 청년 안분
- [ ] 증빙 요구사항 자동 생성
- [ ] 정산 상태 전환

### M6. 서식16 출력

- [ ] 원본 서식16 xlsx 확보
- [ ] 셀 매핑 문서 작성
- [ ] xlsx 생성 모듈 구현
- [ ] 실제 제출 파일과 대조

---

## 12. 남은 의사결정

아래는 구현 전에 사용자가 정해야 한다.

1. 참여청년 생년월일을 저장할지, 서식 출력 직전에만 입력할지
2. 증빙 파일 업로드를 Supabase Storage로 갈지, Railway 볼륨/S3 호환 스토리지로 갈지
3. 첫 구현에서 검증 규칙을 경고만 할지, 일부는 바로 차단할지
4. 루트 화면을 바로 대시보드로 바꿀지, 기존 지출결의서 목록과 탭으로 병행할지
5. 서식16 원본 xlsx를 어디에 보관할지

---

## 13. 1차 구현 권장 순서

가장 안전한 순서는 다음이다.

1. 스키마와 시드만 추가한다.
2. 기존 문서 작성 기능이 그대로 되는지 확인한다.
3. 읽기 전용 대시보드를 먼저 만든다.
4. 그다음 결의서 작성 화면에 청년 안분과 증빙 체크리스트를 붙인다.
5. 마지막에 서식16 자동 생성과 차단 검증을 붙인다.

이 순서가 좋은 이유는 정산 데이터 구조를 먼저 확보하면서도, 현재 지출품의/결의서 생성 업무를 멈추지 않을 수 있기 때문이다.

---

## 14. 확인 근거

- 로컬 기준 문서: `docs/2026-youth-guideline-implementation.md`
- 로컬 현재 스키마: `supabase/schema.sql`
- 청년재단 사업 안내: `https://kyf.or.kr/user/business/businessGuide.do`
- 2026 청년다다름사업 운영기관 모집 공고/첨부자료 게시: `https://seoulpa.kr/home/kor/M278003565/npo/news/view.do?idx=cb00d1a0008a85e71a41b8741facbffe2f9d3dc52823465b4d2d8a3cd97ae40f`
