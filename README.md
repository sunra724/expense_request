# Expense Request

지출결의서와 지출품의서를 한 앱에서 관리하는 Next.js 문서 시스템입니다.

## 포함 기능

- 지출결의서 목록, 작성, 수정, 삭제
- 지출품의서 목록, 작성, 수정, 삭제
- 단건 미리보기 및 인쇄
- 다건 일괄 인쇄
- 결재자/기관 정보 설정
- Supabase 연결 전에도 확인 가능한 메모리 기반 개발 모드

## 기술 스택

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase
- Railway

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열면 됩니다.

## 환경 변수

`.env.local` 파일을 만들고 아래 값을 넣습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

값이 없으면 앱은 메모리 fallback 데이터로 동작합니다.

## Supabase 준비

`supabase/schema.sql` 파일 내용을 Supabase SQL Editor에서 실행합니다.

## 배포

- 코드: GitHub
- 앱: Railway
- DB: Supabase

## 비고

- 현재 결재 라인은 `담당자 / 실장 / 이사장`
- 지출품의서 하단 서명은 `협동조합 soilab (인)` 기준입니다.
