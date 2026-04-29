# 청년 다다름 사업 관리 시스템

협동조합 소이랩의 2026년 청년 다다름 사업 운영을 위한 지출품의서, 지출결의서, 예산, 참여청년 한도, 증빙, 일정 관리 대시보드입니다.

## 주요 기능

- 정산 대시보드: 총 사업비, 직접사업비, 간접사업비, 집행률, 청년별 한도, 증빙 상태 확인
- 지출품의서 관리: 작성, 수정, 복제, 미리보기, 일괄 출력
- 지출결의서 관리: 품의서 기반 작성, 복제, 증빙/사진 첨부, Google Drive 업로드
- 예산관리: 직접/간접 총액과 세목·세세목별 실행예산 관리
- 참여청년 관리: 청년 20명 기준 직접사업비 안분 및 1인 한도 확인
- Google Calendar 연동: 사업 일정, 정산/보고 마감, 운영 일정 읽기 전용 표시
- Supabase 기반 운영 DB와 로컬 메모리 fallback 개발 모드

## 기술 스택

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase
- Google Calendar iCal
- Google Drive API
- Railway

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

`.env.local` 파일을 만들고 아래 값을 설정합니다. 실제 키와 비공개 iCal 주소는 Git에 커밋하지 않습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CALENDAR_ICAL_URL=
GOOGLE_CALENDAR_NAME=2026년 청년 다다름 사업

GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_PROJECT_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

Google Drive 환경변수는 PDF 업로드 기능을 사용할 때 필요합니다. 캘린더는 비공개 iCal 주소를 읽기 전용으로 사용합니다.

## Supabase 준비

Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.

적용 전에는 Supabase 백업을 먼저 권장합니다. 현재 스키마에는 청년 다다름 사업용 테이블, 예산 라인, 청년별 안분, 증빙/승인/정산 점검용 테이블이 포함되어 있습니다.

## Railway 배포

1. GitHub `main` 브랜치에 푸시합니다.
2. Railway 프로젝트를 GitHub 저장소와 연결합니다.
3. Railway Variables에 `.env.local`과 같은 운영 환경변수를 설정합니다.
4. 배포 후 `/`, `/budgets`, `/proposals`, `/expenditures` 화면을 확인합니다.

Railway에서 필요한 핵심 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CALENDAR_ICAL_URL=
GOOGLE_CALENDAR_NAME=2026년 청년 다다름 사업
```

## 저장소/서비스 이름 변경

기존 `expense_request` 이름은 현재 시스템 범위와 맞지 않으므로 아래처럼 바꾸는 것을 권장합니다.

추천 저장소 이름:

```text
soilab-dadareum-2026
```

GitHub에서 저장소 이름을 바꾼 뒤 로컬 remote도 변경합니다.

```powershell
git remote set-url origin https://github.com/sunra724/soilab-dadareum-2026.git
git remote -v
```

Railway 프로젝트/서비스 이름도 `청년 다다름 사업 관리 시스템` 또는 `soilab-dadareum-2026`으로 맞추면 운영 중 혼동을 줄일 수 있습니다.

## 운영 규칙

- Google Calendar 제목은 `[정산]`, `[보고]`, `[운영]`, `[상담]`, `[프로그램]`, `[지출]` 태그로 시작합니다.
- 캘린더에는 주민번호, 주소, 전화번호 같은 민감 개인정보를 넣지 않습니다.
- 참여청년은 신청번호나 내부 식별번호 중심으로 관리합니다.
- 직접사업비 지출은 청년별 안분을 입력해야 1인 한도 잔액이 계산됩니다.
- 지출결의서는 증빙 체크가 완료된 뒤 완료 처리합니다.

## 확인 명령

```bash
npm run lint
npm run build
```
