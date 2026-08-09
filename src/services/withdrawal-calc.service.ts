import Decimal from 'decimal.js';

export interface IWithdrawalCalcOptions {
  amountVnd: Decimal;
  withdrawalExchangeRate: Decimal;
}

export interface IWithdrawalCalcResult {
  amountVnd: Decimal;
  amountUsdt: Decimal;
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
    const { amountVnd, withdrawalExchangeRate } = options;

    if (amountVnd.lessThanOrEqualTo(0)) {
      throw new Error('Số tiền rút phải lớn hơn 0');
    }

    if (withdrawalExchangeRate.lessThanOrEqualTo(0)) {
      throw new Error('Tỷ giá rút chưa được thiết lập');
    }

    const amountUsdt = amountVnd.div(withdrawalExchangeRate).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

    return {
      amountVnd,
      amountUsdt,
    };
  }
}
