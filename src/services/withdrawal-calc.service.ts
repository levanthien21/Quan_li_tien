import Decimal from 'decimal.js';

export interface IWithdrawalCalcOptions {
  amountUsdt: Decimal;
  withdrawalExchangeRate: Decimal;
}

export interface IWithdrawalCalcResult {
  amountUsdt: Decimal;
  equivalentVnd?: Decimal;
}

/**
 * Requirement #13 & #27: Withdrawal Calculation Service.
 * Separated into an isolated service so that custom VND conversion rules
 * (e.g. withdrawal fees, conversion rates) can be easily added in the future.
 */
export class WithdrawalCalculationService {
  /**
   * Calculates withdrawal output details.
   */
  calculateWithdrawal(options: IWithdrawalCalcOptions): IWithdrawalCalcResult {
    const { amountUsdt, withdrawalExchangeRate } = options;

    if (amountUsdt.lessThanOrEqualTo(0)) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Currently direct USDT withdrawal calculation
    let equivalentVnd: Decimal | undefined;
    if (withdrawalExchangeRate.greaterThan(0)) {
      equivalentVnd = amountUsdt.mul(withdrawalExchangeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    return {
      amountUsdt,
      equivalentVnd,
    };
  }
}
