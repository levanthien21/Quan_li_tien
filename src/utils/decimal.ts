import Decimal from 'decimal.js';

// Configure decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Calculates fee amount: deposit_amount * fee_percent / 100
 */
export function calculateFeeAmount(amountVnd: Decimal, feePercent: Decimal): Decimal {
  return amountVnd.mul(feePercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates net amount: deposit_amount - fee_amount
 */
export function calculateNetAmount(amountVnd: Decimal, feeAmountVnd: Decimal): Decimal {
  return amountVnd.sub(feeAmountVnd).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates USDT amount: net_amount / deposit_exchange_rate
 */
export function calculateUsdtAmount(netAmountVnd: Decimal, exchangeRate: Decimal): Decimal {
  if (exchangeRate.isZero()) {
    throw new Error('Exchange rate cannot be zero');
  }
  // Store high precision for USDT (6 decimal places), format to 2 when displaying
  return netAmountVnd.div(exchangeRate).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}

/**
 * Format USDT for display (2 decimal places)
 */
export function formatUsdtDisplay(usdt: Decimal | string | number): string {
  const dec = new Decimal(usdt);
  return dec.toFixed(2);
}

/**
 * Format VND for display (commas as thousands separators)
 */
export function formatVndDisplay(vnd: Decimal | string | number): string {
  const dec = new Decimal(vnd);
  const num = dec.toNumber();
  return new Intl.NumberFormat('vi-VN').format(num);
}
