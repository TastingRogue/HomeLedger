/**
 * Money precision helpers.
 *
 * All monetary values in HomeLedger are decimal amounts with 2 decimal places
 * (cents). They are stored as SQLite `real` (IEEE-754 double), so summing many
 * of them accumulates tiny floating-point errors (the classic `0.1 + 0.2` case).
 *
 * To keep totals exact to the cent, round the result of any monetary
 * aggregation — and any monetary value that gets persisted as the result of
 * arithmetic — through `roundMoney`. This does not change the storage format or
 * the API contract (amounts stay decimal numbers); it just removes sub-cent
 * drift at the points where it would otherwise accumulate or be written back.
 */

/**
 * Round a monetary amount to 2 decimals (cents), correcting float drift.
 * Uses the standard `Math.round(x * 100) / 100` approach; the `+ Number.EPSILON`
 * nudge avoids the rare case where a value like 1.005 rounds down due to its
 * binary representation.
 */
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Sum a list of monetary amounts, rounding the result to cents.
 * Prefer this over a raw `reduce((a, b) => a + b, 0)` for money.
 */
export function sumMoney(amounts: number[]): number {
  return roundMoney(amounts.reduce((total, n) => total + (Number.isFinite(n) ? n : 0), 0));
}

/** True if the value has at most 2 decimal places. */
export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.round(value * 100) === value * 100;
}
