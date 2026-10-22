// Money helpers. Every `*_cents` column holds ZAR cents; the UI always shows Rands.
// Hosts always type Rands.

const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format a cents value as Rands, e.g. 15000 → "R 150", 14999 → "R 149,99". */
export function formatZar(cents: number) {
  return zar.format(cents / 100);
}

/**
 * Parse what a host typed into a Rand price field ("150", "149.99", "149,99",
 * "R 1 500") into whole cents. Returns NaN for anything that isn't a price.
 */
export function randsToCents(input: string): number {
  const cleaned = input.replace(/[Rr\s]/g, "").replace(",", ".");
  if (cleaned === "" || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

/** Cents → the plain Rand string used to pre-fill a price input. */
export function centsToRandsInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
