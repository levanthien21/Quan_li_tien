import Decimal from 'decimal.js';
import { DepositInput, DepositResult, TransactionType } from '../types/index.js';
import { calculateFeeAmount, calculateNetAmount, calculateUsdtAmount } from '../utils/decimal.js';
import { FeeRateService } from './fee-rate.service.js';
import { BalanceService } from './balance.service.js';

export interface IDepositRepository {
  createTransaction(txData: {
    groupId: bigint;
    customerId: bigint;
    operatorId: bigint;
    type: TransactionType;
    amountVnd: Decimal;
    feePercent: Decimal;
    feeAmountVnd: Decimal;
    netAmountVnd: Decimal;
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

export class DepositService {
  constructor(
    private depositRepository: IDepositRepository,
    private feeRateService: FeeRateService,
    private balanceService: BalanceService
  ) {}

  async processDeposit(input: DepositInput): Promise<DepositResult> {
    const { groupId, customerId, operatorId, amountVnd, telegramMessageId, note } = input;

    // 1. Determine Fee %
    const feePercent =
      input.customFeePercent !== undefined
        ? input.customFeePercent
        : await this.feeRateService.resolveFeePercent(groupId, customerId);

    // 2. Determine Exchange Rate
    const exchangeRate =
      input.customExchangeRate !== undefined
        ? input.customExchangeRate
        : await this.feeRateService.resolveDepositExchangeRate(groupId);

    // 3. Financial calculations
    const feeAmountVnd = calculateFeeAmount(amountVnd, feePercent);
    const netAmountVnd = calculateNetAmount(amountVnd, feeAmountVnd);
    const amountUsdt = calculateUsdtAmount(netAmountVnd, exchangeRate);

    // 4. Transaction type (DEPOSIT vs ADJUSTMENT for negative amounts)
    const type: TransactionType = amountVnd.isNegative() ? 'ADJUSTMENT' : 'DEPOSIT';

    // 5. Save to database
    const createdTx = await this.depositRepository.createTransaction({
      groupId,
      customerId,
      operatorId,
      type,
      amountVnd,
      feePercent,
      feeAmountVnd,
      netAmountVnd,
      exchangeRate,
      amountUsdt,
      telegramMessageId,
      note,
    });

    // 6. Get customer display name
    const customerName = await this.depositRepository.getCustomerName(customerId);

    // 7. Get updated balance
    const currentBalanceUsdt = await this.balanceService.getCustomerBalanceUsdt(groupId, customerId);

    // 8. Get top 5 recent transactions
    const recentTransactions = await this.depositRepository.getRecentTransactions(groupId, customerId, 5);

    return {
      transactionId: createdTx.id,
      groupId,
      customerId,
      customerName,
      amountVnd,
      feePercent,
      feeAmountVnd,
      netAmountVnd,
      exchangeRate,
      amountUsdt,
      currentBalanceUsdt,
      recentTransactions,
    };
  }
}
