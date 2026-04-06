export const budgetScopeOptions = [
  { value: "direct", label: "직접비" },
  { value: "indirect", label: "간접비" },
] as const;

export type BudgetScope = (typeof budgetScopeOptions)[number]["value"];

export const paymentMethodOptions = [
  { value: "corporate_card", label: "법인카드" },
  { value: "check_card", label: "체크카드" },
  { value: "account_transfer", label: "계좌이체" },
  { value: "youth_transfer", label: "청년 실비지급" },
] as const;

export type ManagedPaymentMethod = (typeof paymentMethodOptions)[number]["value"];

export function normalizePaymentMethod(value: unknown): ManagedPaymentMethod {
  const text = String(value ?? "");
  const byValue = paymentMethodOptions.find((option) => option.value === text);
  if (byValue) return byValue.value;

  const byLabel = paymentMethodOptions.find((option) => option.label === text);
  return byLabel?.value ?? "account_transfer";
}

export function paymentMethodLabel(value: string) {
  return paymentMethodOptions.find((option) => option.value === value)?.label ?? value;
}

export const evidenceTypeOptions = [
  { value: "tax_invoice", label: "세금계산서" },
  { value: "card_payment", label: "카드결제" },
  { value: "youth_transfer", label: "청년 개인 계좌이체" },
  { value: "other", label: "기타" },
] as const;

export type ManagedEvidenceType = (typeof evidenceTypeOptions)[number]["value"];

export function normalizeEvidenceType(value: unknown): ManagedEvidenceType {
  const text = String(value ?? "");
  const byValue = evidenceTypeOptions.find((option) => option.value === text);
  if (byValue) return byValue.value;

  const byLabel = evidenceTypeOptions.find((option) => option.label === text);
  return byLabel?.value ?? "other";
}

export function evidenceTypeLabel(value: string) {
  return evidenceTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export const evidenceChecklistOptions = [
  { key: "proposal_document", label: "지출결의서(품의서)" },
  { key: "grant_request_form", label: "역량강화지원금 신청서" },
  { key: "vendor_registration", label: "거래처 사업자등록증" },
  { key: "vendor_bankbook", label: "거래처 통장사본" },
  { key: "tax_invoice", label: "세금계산서" },
  { key: "card_receipt", label: "카드전표" },
  { key: "shopping_capture", label: "구매사이트 화면캡처" },
  { key: "transaction_statement", label: "거래명세서" },
  { key: "quote", label: "견적서" },
  { key: "contract", label: "계약서" },
  { key: "meeting_minutes", label: "회의록" },
  { key: "attendance_sheet", label: "출석부" },
  { key: "photo_proof", label: "사진자료" },
  { key: "travel_plan", label: "출장계획" },
  { key: "travel_report", label: "출장결과보고" },
] as const;

export type EvidenceChecklistKey = (typeof evidenceChecklistOptions)[number]["key"];

export function evidenceChecklistLabel(value: string) {
  return evidenceChecklistOptions.find((option) => option.key === value)?.label ?? value;
}

export function defaultEvidenceChecklist(paymentMethod: ManagedPaymentMethod): EvidenceChecklistKey[] {
  const common: EvidenceChecklistKey[] = ["proposal_document"];

  switch (paymentMethod) {
    case "corporate_card":
    case "check_card":
      return [...common, "vendor_registration", "vendor_bankbook", "card_receipt", "shopping_capture", "transaction_statement"];
    case "youth_transfer":
      return [...common, "vendor_bankbook", "transaction_statement"];
    case "account_transfer":
    default:
      return [...common, "vendor_registration", "vendor_bankbook", "tax_invoice", "transaction_statement"];
  }
}

export function budgetScopeLabel(value: string) {
  return budgetScopeOptions.find((option) => option.value === value)?.label ?? value;
}

export type GuidelineRuleSeverity = "warning" | "blocking";

export type GuidelineRule = {
  id: string;
  title: string;
  severity: GuidelineRuleSeverity;
  description: string;
  relatedFields: string[];
};

export const guidelineRules: GuidelineRule[] = [
  {
    id: "cash-payment-forbidden",
    title: "현금 지급 불가",
    severity: "blocking",
    description: "사업비는 법인카드/체크카드 또는 계좌이체 방식만 인정된다.",
    relatedFields: ["payment_method"],
  },
  {
    id: "direct-indirect-transfer-forbidden",
    title: "직접비와 간접비 간 전용 불가",
    severity: "blocking",
    description: "직접비와 간접비 사이의 전용은 허용되지 않는다.",
    relatedFields: ["budget_scope", "transfer_note"],
  },
  {
    id: "transfer-over-ten-percent",
    title: "세목 전용 10% 초과 점검",
    severity: "warning",
    description: "세목 전용 누적 10% 이상은 재단 승인 대상이다.",
    relatedFields: ["budget_category", "budget_item", "requires_foundation_approval"],
  },
  {
    id: "missing-core-evidence",
    title: "핵심 증빙 누락",
    severity: "blocking",
    description: "최종확정 전 필수 증빙 체크리스트를 모두 확인해야 한다.",
    relatedFields: ["evidence_checklist"],
  },
  {
    id: "meeting-cost-limit",
    title: "회의비 식비 한도 초과",
    severity: "warning",
    description: "회의 식비는 1인 15,000원을 초과할 수 없다.",
    relatedFields: ["attendee_count", "unit_amount"],
  },
  {
    id: "promotion-cost-limit",
    title: "사업추진비 상한 점검",
    severity: "warning",
    description: "사업추진비는 1인 30,000원 상한과 운영인건비 5% 한도를 점검해야 한다.",
    relatedFields: ["attendee_count", "unit_amount"],
  },
  {
    id: "travel-overseas-forbidden",
    title: "해외출장 불가",
    severity: "blocking",
    description: "지침상 해외출장은 집행이 불가하다.",
    relatedFields: ["travel_plan"],
  },
  {
    id: "vat-must-be-excluded",
    title: "환급 부가세 제외 필요",
    severity: "warning",
    description: "환급 또는 공제 대상 부가가치세는 집행 인정금액에서 제외해야 한다.",
    relatedFields: ["supply_amount", "vat_amount", "eligible_amount"],
  },
];

export const restrictedMerchantKeywords = [
  "룸살롱",
  "스탠드바",
  "나이트클럽",
  "단란주점",
  "노래방",
  "성인용품",
  "안마",
  "사우나",
  "실내골프장",
  "카지노",
  "전자오락실",
  "게임방",
  "복권",
  "상품권",
  "주류",
] as const;
