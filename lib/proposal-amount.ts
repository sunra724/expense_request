import { mergeEligibleAmount } from "@/lib/format";
import type { Proposal, ProposalInput, ProposalItem } from "@/lib/types";

type ProposalAmountSource = Pick<
  Proposal | ProposalInput,
  "total_amount" | "eligible_amount" | "supply_amount" | "vat_amount"
> & {
  items?: ProposalItem[];
};

function sumProposalItems(items: ProposalItem[] = []) {
  return items.reduce((sum, item) => sum + Number(item.estimated_amount || 0), 0);
}

function hasProposalItemContent(item: ProposalItem) {
  return Boolean(
    Number(item.estimated_amount || 0) ||
      item.expense_category.trim() ||
      item.description.trim() ||
      item.calculation_basis.trim() ||
      item.note.trim(),
  );
}

export function resolveProposalAmount(source: ProposalAmountSource) {
  return (
    Number(source.total_amount || 0) ||
    sumProposalItems(source.items) ||
    Number(source.eligible_amount || 0) ||
    mergeEligibleAmount(source.supply_amount, source.vat_amount)
  );
}

export function resolveProposalItemAmount(item: ProposalItem, source: ProposalAmountSource) {
  const amount = Number(item.estimated_amount || 0);
  if (amount) return amount;

  const contentItems = source.items?.filter(hasProposalItemContent) ?? [];
  if (source.items?.length === 1 || (contentItems.length === 1 && contentItems[0] === item)) {
    return resolveProposalAmount(source);
  }

  return 0;
}

export function withResolvedProposalAmount<T extends ProposalInput>(input: T): T {
  const totalAmount = resolveProposalAmount(input);
  const itemTotal = sumProposalItems(input.items);
  const contentItems = input.items.filter(hasProposalItemContent);
  const items =
    totalAmount && !itemTotal && (input.items.length === 1 || contentItems.length === 1)
      ? [{ ...(contentItems[0] ?? input.items[0]), estimated_amount: totalAmount }]
      : input.items;

  return {
    ...input,
    total_amount: totalAmount,
    items,
  };
}
