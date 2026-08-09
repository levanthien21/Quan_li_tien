import Decimal from 'decimal.js';

export interface IFeeRateRepository {
  getCustomerFee(groupId: bigint, customerId: bigint): Promise<Decimal | null>;
  getGroupDefaultFee(groupId: bigint): Promise<Decimal>;
  getGroupDepositRate(groupId: bigint): Promise<Decimal>;
  getGroupWithdrawalRate(groupId: bigint): Promise<Decimal>;
  getFeeIsSet(groupId: bigint): Promise<boolean>;
}

export class RateNotSetError extends Error {
  constructor(public rateType: 'deposit' | 'withdrawal') {
    super(
      rateType === 'deposit'
        ? '⚠️ Chưa cài đặt tỷ giá nạp!\n\nVui lòng Admin cài đặt trước:\n`/setdepositrate <tỷ_giá>`\nVí dụ: `/setdepositrate 25500`'
        : '⚠️ Chưa cài đặt tỷ giá rút!\n\nVui lòng Admin cài đặt trước:\n`/setwithdrawrate <tỷ_giá>`\nVí dụ: `/setwithdrawrate 24500`'
    );
    this.name = 'RateNotSetError';
  }
}

export class FeeNotSetError extends Error {
  constructor() {
    super(
      '⚠️ Chưa cài đặt phí giao dịch!\n\nVui lòng Admin cài đặt trước:\n`/setfee <phần_trăm>`\nVí dụ: `/setfee 2` (2%) hoặc `/setfee 0` (miễn phí)'
    );
    this.name = 'FeeNotSetError';
  }
}

export class FeeRateService {
  constructor(private repository: IFeeRateRepository) {}

  /**
   * Checks if fee has been explicitly configured for this group.
   * Throws FeeNotSetError if admin hasn't run /setfee yet.
   */
  async checkFeeIsSet(groupId: bigint): Promise<void> {
    const isSet = await this.repository.getFeeIsSet(groupId);
    if (!isSet) {
      throw new FeeNotSetError();
    }
  }

  /**
   * Resolves fee percent with hierarchy: Customer-specific > Group-default > 0%
   * Throws FeeNotSetError if fee hasn't been configured yet.
   */
  async resolveFeePercent(groupId: bigint, customerId: bigint): Promise<Decimal> {
    await this.checkFeeIsSet(groupId);
    const customFee = await this.repository.getCustomerFee(groupId, customerId);
    if (customFee !== null) {
      return customFee;
    }
    return this.repository.getGroupDefaultFee(groupId);
  }

  /**
   * Resolves Deposit exchange rate from DB (manual setting).
   * Throws RateNotSetError if not configured yet (rate = 0).
   */
  async resolveDepositExchangeRate(groupId: bigint): Promise<Decimal> {
    const rate = await this.repository.getGroupDepositRate(groupId);
    if (rate.isZero()) {
      throw new RateNotSetError('deposit');
    }
    return rate;
  }

  /**
   * Resolves Withdrawal exchange rate from DB (manual setting).
   * Throws RateNotSetError if not configured yet (rate = 0).
   */
  async resolveWithdrawalExchangeRate(groupId: bigint): Promise<Decimal> {
    const rate = await this.repository.getGroupWithdrawalRate(groupId);
    if (rate.isZero()) {
      throw new RateNotSetError('withdrawal');
    }
    return rate;
  }
}

