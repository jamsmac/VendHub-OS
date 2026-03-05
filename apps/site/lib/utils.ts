/**
 * Format a number as a price string with space-separated thousands.
 * Example: 20000 → "20 000"
 */
export function formatPrice(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
