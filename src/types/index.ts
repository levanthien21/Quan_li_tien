import Decimal from 'decimal.js';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT';

export interface GroupConfig {
  id: bigint;
  title: string | null;
  operatorId: string | null;
  defaultFeePercent: Decimal;
  depositExchangeRate: Decimal;
  withdrawalExchangeRate: Decimal;
  isActive: boolean;
}

export interface CustomerProfile {
  id: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface DepositInput {
  groupId: bigint;
  customerId: bigint;
  operatorId: bigint;
  amountVnd: Decimal;
  customFeePercent?: Decimal;
  customExchangeRate?: Decimal;
  telegramMessageId?: bigint;
  note?: string;
}

export interface DepositResult {
  transactionId: string;
  groupId: bigint;
  customerId: bigint;
  customerName: string;
  amountVnd: Decimal;
  feePercent: Decimal;
  feeAmountVnd: Decimal;
  netAmountVnd: Decimal;
  exchangeRate: Decimal;
  amountUsdt: Decimal;
  currentBalanceUsdt: Decimal;
  recentTransactions: Array<{
    id: string;
    type: TransactionType;
    createdAt: Date;
    amountVnd: Decimal;
    feePercent: Decimal;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
  }>;
}

export interface WithdrawInput {
  groupId: bigint;
  customerId: bigint;
  operatorId: bigint;
  amountUsdt: Decimal;
  telegramMessageId?: bigint;
  note?: string;
}

export interface WithdrawResult {
  transactionId: string;
  groupId: bigint;
  customerId: bigint;
  customerName: string;
  previousBalanceUsdt: Decimal;
  withdrawUsdt: Decimal;
  remainingBalanceUsdt: Decimal;
  recentTransactions: Array<{
    id: string;
    type: TransactionType;
    createdAt: Date;
    amountVnd: Decimal;
    feePercent: Decimal;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
  }>;
}

export interface GroupSummaryReport {
  groupId: bigint;
  groupTitle: string;
  depositFeeRate: Decimal;
  depositExchangeRate: Decimal;
  withdrawalExchangeRate: Decimal;
  totalDepositVnd: Decimal;
  totalNetDepositVnd: Decimal;
  totalDepositUsdt: Decimal;
  totalWithdrawalUsdt: Decimal;
  remainingBalanceUsdt: Decimal;
  customerCount: number;
  transactionCount: number;
}
