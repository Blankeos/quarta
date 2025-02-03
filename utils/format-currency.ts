export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  });
}
