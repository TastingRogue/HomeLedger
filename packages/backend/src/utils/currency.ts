/**
 * Currency formatting utilities for HomeLedger.
 * Formats amounts in Mexican Peso (MXN) with the "MX$X,XXX.XX" format.
 */

/**
 * Formats a numeric amount as Mexican Peso currency string.
 *
 * Rules:
 * - Format: "MX$X,XXX.XX"
 * - Comma as thousands separator
 * - Dot as decimal separator
 * - Always exactly 2 decimal places
 * - Negative amounts prefixed with "-" (e.g., "-MX$1,500.00")
 * - Zero displays as "MX$0.00"
 *
 * @param amount - The numeric amount to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56)     // "MX$1,234.56"
 * formatCurrency(0)           // "MX$0.00"
 * formatCurrency(-1500)       // "-MX$1,500.00"
 * formatCurrency(1000000.99)  // "MX$1,000,000.99"
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  // Format with exactly 2 decimal places
  const fixed = absoluteAmount.toFixed(2);

  // Split into integer and decimal parts
  const parts = fixed.split('.');
  const integerPart = parts[0] ?? '0';
  const decimalPart = parts[1] ?? '00';

  // Add comma thousand separators to integer part
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Assemble the final string
  const formatted = `MX$${withCommas}.${decimalPart}`;

  return isNegative ? `-${formatted}` : formatted;
}
