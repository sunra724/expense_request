import { mergeEligibleAmount } from "@/lib/format";
import type { Expenditure, ExpenditureInput, ExpenditureItem } from "@/lib/types";

type ExpenditureAmountSource = Pick<
  Expenditure | ExpenditureInput,
  "total_amount" | "eligible_amount" | "supply_amount" | "vat_amount"
> & {
  items?: ExpenditureItem[];
};

function sumExpenditureItems(items: ExpenditureItem[] = []) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function hasExpenditureItemContent(item: ExpenditureItem) {
  return Boolean(Number(item.amount || 0) || item.description.trim() || item.note.trim());
}

export function resolveExpenditureAmount(source: ExpenditureAmountSource) {
  return (
    Number(source.total_amount || 0) ||
    sumExpenditureItems(source.items) ||
    Number(source.eligible_amount || 0) ||
    mergeEligibleAmount(source.supply_amount, source.vat_amount)
  );
}

export function resolveExpenditureItemAmount(item: ExpenditureItem, source: ExpenditureAmountSource) {
  const amount = Number(item.amount || 0);
  if (amount) return amount;

  const contentItems = source.items?.filter(hasExpenditureItemContent) ?? [];
  if (source.items?.length === 1 || (contentItems.length === 1 && contentItems[0] === item)) {
    return resolveExpenditureAmount(source);
  }

  return 0;
}

export function withResolvedExpenditureAmount<T extends ExpenditureInput>(input: T): T {
  const totalAmount = resolveExpenditureAmount(input);
  const itemTotal = sumExpenditureItems(input.items);
  const contentItems = input.items.filter(hasExpenditureItemContent);
  const items =
    totalAmount && !itemTotal && contentItems.length <= 1
      ? [{ ...(contentItems[0] ?? input.items[0] ?? { description: "", amount: 0, note: "" }), amount: totalAmount }]
      : input.items;

  return {
    ...input,
    total_amount: totalAmount,
    items,
  };
}
