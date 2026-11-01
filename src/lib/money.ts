/**
 * BizLedger Strict Minor-Units (Kobo) Financial Mathematics Utility
 * 
 * In Nigerian financial management and banking, 1 Naira (NGN) = 100 Kobo.
 * All monetary values are strictly represented and stored as whole integer kobo (minor units).
 * Floating-point arithmetic is never directly used to store or accumulate monetary ledger balances.
 */

export const KOBO_PER_NAIRA = 100;

/**
 * Converts a Naira decimal or string to whole integer Kobo
 * Example: "1500.50" -> 150050, 250 -> 25000
 */
export function nairaToKobo(amountInNaira: number | string): number {
  if (typeof amountInNaira === 'string') {
    // Strip currency symbols, commas, spaces
    const sanitized = amountInNaira.replace(/[₦,$\s]/g, '').trim();
    if (!sanitized || isNaN(Number(sanitized))) return 0;
    const parsed = parseFloat(sanitized);
    return Math.round(parsed * KOBO_PER_NAIRA);
  }
  if (isNaN(amountInNaira)) return 0;
  return Math.round(amountInNaira * KOBO_PER_NAIRA);
}

/**
 * Converts whole integer Kobo to Naira decimal for display
 */
export function koboToNaira(amountInKobo: number): number {
  if (isNaN(amountInKobo)) return 0;
  return Math.round(amountInKobo) / KOBO_PER_NAIRA;
}

/**
 * Formats integer Kobo into Nigerian Naira string with proper comma separation
 * Example: 150050 -> "₦1,500.50" or "1,500.50"
 */
export function formatNaira(amountInKobo: number, includeSymbol: boolean = true): string {
  const safeKobo = Math.round(Number(amountInKobo) || 0);
  const isNegative = safeKobo < 0;
  const absKobo = Math.abs(safeKobo);
  
  const wholeNaira = Math.floor(absKobo / KOBO_PER_NAIRA);
  const remainderKobo = absKobo % KOBO_PER_NAIRA;
  
  const formattedWhole = wholeNaira.toLocaleString('en-NG');
  const formattedKobo = remainderKobo.toString().padStart(2, '0');
  
  const sign = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₦' : '';
  
  return `${sign}${symbol}${formattedWhole}.${formattedKobo}`;
}

export const formatKoboToNaira = formatNaira;

/**
 * Safe integer addition of multiple kobo amounts
 */
export function addMinor(...amounts: number[]): number {
  return amounts.reduce((sum, curr) => sum + Math.round(Number(curr) || 0), 0);
}

/**
 * Safe integer subtraction
 */
export function subtractMinor(a: number, b: number): number {
  return Math.round(Number(a) || 0) - Math.round(Number(b) || 0);
}

/**
 * Calculates discount amount in integer Kobo
 */
export function calculateDiscountAmountMinor(subtotalMinor: number, discountPercent: number): number {
  if (discountPercent <= 0) return 0;
  const cappedPercent = Math.min(100, Math.max(0, discountPercent));
  return Math.round((subtotalMinor * cappedPercent) / 100);
}

/**
 * Calculates standard Nigerian VAT (7.5%) or custom VAT in integer Kobo
 */
export function calculateVatAmountMinor(taxableAmountMinor: number, vatPercent: number = 7.5): number {
  if (vatPercent <= 0) return 0;
  return Math.round((taxableAmountMinor * vatPercent) / 100);
}

/**
 * Calculates Withholding Tax (WHT) deduction in integer Kobo (usually 5% or 10%)
 */
export function calculateWhtAmountMinor(taxableAmountMinor: number, whtPercent: number = 5): number {
  if (whtPercent <= 0) return 0;
  return Math.round((taxableAmountMinor * whtPercent) / 100);
}

/**
 * Calculates line total for invoice/quotation line item in integer Kobo
 */
export function calculateLineTotalMinor(
  quantity: number,
  unitPriceMinor: number,
  discountPercent: number = 0,
  vatPercent: number = 0
): {
  grossMinor: number;
  discountMinor: number;
  vatMinor: number;
  netTotalMinor: number;
} {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const grossMinor = Math.round(safeQty * unitPriceMinor);
  const discountMinor = calculateDiscountAmountMinor(grossMinor, discountPercent);
  const afterDiscountMinor = Math.max(0, grossMinor - discountMinor);
  const vatMinor = calculateVatAmountMinor(afterDiscountMinor, vatPercent);
  const netTotalMinor = afterDiscountMinor + vatMinor;

  return {
    grossMinor,
    discountMinor,
    vatMinor,
    netTotalMinor,
  };
}
