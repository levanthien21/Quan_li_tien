import Decimal from 'decimal.js';
import { WithdrawInput, WithdrawResult, TransactionType } from '../types/index.js';
import { BalanceService } from './balance.service.js';
import { FeeRateService } from './fee-rate.service.js';
import { WithdrawalCalculationService } from './withdrawal-calc.service.js';

export interface IWithdrawalRepository {
  createWithdrawalTransaction(txData: {
    groupId: bigint;
    customerId: bigint;
    operatorId: bigint;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
    telegramMessageId?: bigint;
    note?: string;
  }): Promise<{ id: string; createdAt: Date }>;

  getCustomerName(customerId: bigint): Promise<string>;

  getRecentTransactions(
    groupId: bigint,
    customerId: bigint,
    limit: number
  ): Promise<
    Array<{
      id: string;
      type: TransactionType;
      createdAt: Date;
      amountVnd: Decimal;
      feePercent: Decimal;
      exchangeRate: Decimal;
      amountUsdt: Decimal;
    }>
  >;
}

export class InsufficientBalanceError extends Error {
  constructor(public currentBalance: Decimal, public requestedAmount: Decimal) {
    super(
      `Số dư USDT không đủ để rút. Số dư hiện tại: ${currentBalance.toFixed(2)} U, Yêu cầu rút: ${requestedAmount.toFixed(2)} U`
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class WithdrawalService {
  constructor(
    private withdrawalRepository: IWithdrawalRepository,
    private balanceService: BalanceService,
    private feeRateService: FeeRateService,
    private calcService: WithdrawalCalculationService
  ) {}

  async processWithdrawal(input: WithdrawInput): Promise<WithdrawResult> {
    const { groupId, customerId, operatorId, amountUsdt, telegramMessageId, note } = input;

    if (amountUsdt.lessThanOrEqualTo(0)) {
      throw new Error('Số tiền rút phải lớn hơn 0');
    }

    // 1. Get current balance (atomic / transaction check)
    const previousBalanceUsdt = await this.balanceService.getCustomerBalanceUsdt(groupId, customerId);

    // 2. Case 6 check: Withdrawal > Balance -> Reject
    if (amountUsdt.greaterThan(previousBalanceUsdt)) {
      throw new InsufficientBalanceError(previousBalanceUsdt, amountUsdt);
    }

    // 3. Resolve withdrawal exchange rate
    const withdrawalExchangeRate = await this.feeRateService.resolveWithdrawalExchangeRate(groupId);

    // 4. Calculate withdrawal details via WithdrawalCalculationService
    this.calcService.calculateWithdrawal({
      amountUsdt,
      withdrawalExchangeRate,
    });

    // 5. Create transaction in DB
    const createdTx = await this.withdrawalRepository.createWithdrawalTransaction({
      groupId,
      customerId,
      operatorId,
      exchangeRate: withdrawalExchangeRate,
      amountUsdt,
      telegramMessageId,
      note,
    });

    // 6. Customer display name & remaining balance
    const customerName = await this.withdrawalRepository.getCustomerName(customerId);
    const remainingBalanceUsdt = previousBalanceUsdt.sub(amountUsdt).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

    // 7. Get top 5 recent transactions
    const recentTransactions = await this.withdrawalRepository.getRecentTransactions(groupId, customerId, 5);

    return {
      transactionId: createdTx.id,
      groupId,
      customerId,
      customerName,
      previousBalanceUsdt,
      withdrawUsdt: amountUsdt,
      remainingBalanceUsdt,
      recentTransactions,
    };
  }
}
