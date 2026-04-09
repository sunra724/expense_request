type AmountModeInput = {
  budgetCategory?: string;
  budgetItem?: string;
  expenseCategory?: string;
};

export type AmountPresentationMode = "vat" | "withholding";

const withholdingKeywords = [
  "인건비",
  "강사",
  "원고료",
  "기타소득",
  "자문",
  "멘토링",
  "상담",
  "컨설팅",
];

export function getAmountPresentationMode(input: AmountModeInput): AmountPresentationMode {
  const text = `${input.budgetCategory ?? ""} ${input.budgetItem ?? ""} ${input.expenseCategory ?? ""}`;
  return withholdingKeywords.some((keyword) => text.includes(keyword)) ? "withholding" : "vat";
}

export function getAmountFieldLabels(mode: AmountPresentationMode) {
  if (mode === "withholding") {
    return {
      vendorId: "사업자등록번호(주민등록번호)",
      firstAmount: "실지급액",
      secondAmount: "원천징수액",
      thirdAmount: "지급총액(세전)",
      exclusionLabel: "원천징수형",
    };
  }

  return {
    vendorId: "사업자등록번호(주민등록번호)",
    firstAmount: "공급가액",
    secondAmount: "세액",
    thirdAmount: "집행인정금액",
    exclusionLabel: "부가세 제외 처리",
  };
}

export function mergeWithholdingAmount(netAmount: number, withholdingAmount: number) {
  return Math.max(0, netAmount) + Math.max(0, withholdingAmount);
}
