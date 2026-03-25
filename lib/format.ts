export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
