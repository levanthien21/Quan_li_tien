import Decimal from 'decimal.js';

export interface IBalanceRepository {
  /**
   * Sums all deposit USDT amounts for a customer in a group
   */
  getNetDepositUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal>;

  /**
   * Sums all withdrawal USDT amounts for a customer in a group
   */
  getWithdrawalUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal>;

  /**
   * Sums all adjustment USDT amounts for a customer in a group
   */
  getAdjustmentUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal>;
}

export class BalanceService {
  constructor(private repository: IBalanceRepository) {}

  /**
   * Current USDT Balance = Total Net Deposit USDT - Total Withdrawal USDT + Total Adjustment USDT
   */
  async getCustomerBalanceUsdt(groupId: bigint, customerId: bigint): Promise<Decimal> {
    const [netDepositSum, withdrawalSum, adjustmentSum] = await Promise.all([
      this.repository.getNetDepositUsdtSum(groupId, customerId),
      this.repository.getWithdrawalUsdtSum(groupId, customerId),
      this.repository.getAdjustmentUsdtSum(groupId, customerId),
    ]);

    // Current Balance = Net Deposit USDT - Withdrawal USDT + Adjustment USDT
    return netDepositSum.sub(withdrawalSum).add(adjustmentSum).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
  }
}
