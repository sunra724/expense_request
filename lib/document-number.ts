import type { BudgetScope } from "@/lib/guideline";

type DocumentKind = "proposal" | "expenditure";

const documentLabels: Record<DocumentKind, string> = {
  proposal: "품의",
  expenditure: "결의",
};

const scopeLabels: Record<BudgetScope, string> = {
  direct: "직접",
  indirect: "간접",
};

function twoDigitYear(dateText?: string) {
  const source =
    dateText && /^\d{4}/.test(dateText) ? dateText : new Date().toISOString().slice(0, 10);
  return source.slice(2, 4);
}

export function buildDocumentPrefix(
  kind: DocumentKind,
  budgetScope: BudgetScope,
  dateText?: string,
) {
  return `다다름-${scopeLabels[budgetScope]}-${documentLabels[kind]}-${twoDigitYear(dateText)}-`;
}

export function splitDocumentNumber(
  currentValue: string,
  kind: DocumentKind,
  budgetScope: BudgetScope,
  dateText?: string,
) {
  const prefix = buildDocumentPrefix(kind, budgetScope, dateText);
  const knownPrefixPattern = /^다다름-(직접|간접)-(품의|결의)-\d{2}-(.*)$/u;
  const trimmedValue = currentValue.trim();

  if (!trimmedValue) {
    return { prefix, suffix: "" };
  }

  const matched = trimmedValue.match(knownPrefixPattern);
  if (!matched) {
    return { prefix, suffix: trimmedValue };
  }

  return {
    prefix,
    suffix: matched[4]?.trim() ?? "",
  };
}

export function applyDocumentPrefix(
  currentValue: string,
  kind: DocumentKind,
  budgetScope: BudgetScope,
  dateText?: string,
) {
  const { prefix, suffix } = splitDocumentNumber(currentValue, kind, budgetScope, dateText);
  return `${prefix}${suffix}`;
}

export function hasDocumentNumberSuffix(
  currentValue: string,
  kind: DocumentKind,
  budgetScope: BudgetScope,
  dateText?: string,
) {
  const { suffix } = splitDocumentNumber(currentValue, kind, budgetScope, dateText);
  return Boolean(suffix.trim());
}
