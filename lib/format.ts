export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function splitVatFromTotal(totalAmount: number) {
  const safeTotal = Math.max(Number(totalAmount) || 0, 0);
  const supplyAmount = Math.round(safeTotal / 1.1);
  const vatAmount = safeTotal - supplyAmount;
  return { supplyAmount, vatAmount };
}

export function mergeEligibleAmount(supplyAmount: number, vatAmount: number, vatExcluded = false) {
  if (vatExcluded) return Math.max(Number(supplyAmount) || 0, 0);
  return Math.max((Number(supplyAmount) || 0) + (Number(vatAmount) || 0), 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
