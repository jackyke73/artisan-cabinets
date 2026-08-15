// All money is stored and computed as integer cents. Never use floats for money.

/** Parse a human price string ("$1,234.50", "1234.5", "1,234") into integer cents. */
export function parsePriceToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/[$,\s]/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Format integer cents as a display string, e.g. 123450 -> "$1,234.50". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Line total in cents (unit price * quantity). */
export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}
