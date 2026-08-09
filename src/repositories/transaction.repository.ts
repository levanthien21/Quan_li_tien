import Decimal from 'decimal.js';
import { prisma } from '../database/prisma.js';
import { TransactionType, GroupSummaryReport } from '../types/index.js';
import { IDepositRepository } from '../services/deposit.service.js';
import { IWithdrawalRepository } from '../services/withdrawal.service.js';
import { IBalanceRepository } from '../services/balance.service.js';
import { CustomerRepository } from './customer.repository.js';

export class TransactionRepository
  implements IDepositRepository, IWithdrawalRepository, IBalanceRepository
{
  constructor(private customerRepository: CustomerRepository) {}

  async createTransaction(txData: {
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
  }): Promise<{ id: string; createdAt: Date }> {
    // Ensure relations exist
    await this.customerRepository.linkCustomerToGroup(txData.groupId, txData.customerId);

    if (txData.operatorId) {
      await prisma.operator.upsert({
        where: { telegramId: txData.operatorId },
        update: {},
        create: {
          telegramId: txData.operatorId,
          name: `Operator ${txData.operatorId}`,
        },
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.transaction.create({
        data: {
          groupId: txData.groupId,
          customerId: txData.customerId,
          operatorId: txData.operatorId,
          type: txData.type,
          amountVnd: txData.amountVnd.toString(),
          feePercent: txData.feePercent.toString(),
          feeAmountVnd: txData.feeAmountVnd.toString(),
          netAmountVnd: txData.netAmountVnd.toString(),
          exchangeRate: txData.exchangeRate.toString(),
          amountUsdt: txData.amountUsdt.toString(),
          telegramMessageId: txData.telegramMessageId,
          note: txData.note,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          operatorId: txData.operatorId,
          groupId: txData.groupId,
          customerId: txData.customerId,
          action: `CREATE_${txData.type}`,
          details: {
            transactionId: result.id,
            amountVnd: txData.amountVnd.toString(),
            amountUsdt: txData.amountUsdt.toString(),
            feePercent: txData.feePercent.toString(),
            exchangeRate: txData.exchangeRate.toString(),
          },
        },
      });

      return result;
    });

    return { id: created.id, createdAt: created.createdAt };
  }

  async createWithdrawalTransaction(txData: {
    groupId: bigint;
    customerId: bigint;
    operatorId: bigint;
    exchangeRate: Decimal;
    amountVnd: Decimal;
    amountUsdt: Decimal;
    telegramMessageId?: bigint;
    note?: string;
  }): Promise<{ id: string; createdAt: Date }> {
    return this.createTransaction({
      groupId: txData.groupId,
      customerId: txData.customerId,
      operatorId: txData.operatorId,
      type: 'WITHDRAWAL',
      amountVnd: txData.amountVnd,
      feePercent: new Decimal(0),
      feeAmountVnd: new Decimal(0),
      netAmountVnd: txData.amountVnd, // For withdrawal, net amount is just the withdrawal amount
      exchangeRate: txData.exchangeRate,
      amountUsdt: txData.amountUsdt,
      telegramMessageId: txData.telegramMessageId,
      note: txData.note,
    });
  }

  async getCustomerName(customerId: bigint): Promise<string> {
    return this.customerRepository.getCustomerDisplayName(customerId);
  }

  async getRecentTransactions(groupId: bigint, customerId: bigint, limit = 5) {
    const records = await prisma.transaction.findMany({
      where: {
        groupId,
        customerId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      amountVnd: new Decimal(r.amountVnd.toString()),
      feePercent: new Decimal(r.feePercent.toString()),
      exchangeRate: new Decimal(r.exchangeRate.toString()),
      amountUsdt: new Decimal(r.amountUsdt.toString()),
    }));
  }

  async getNetDepositUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal> {
    const aggregate = await prisma.transaction.aggregate({
      _sum: {
        amountUsdt: true,
      },
      where: {
        groupId,
        customerId,
        type: 'DEPOSIT',
      },
    });

    return new Decimal(aggregate._sum.amountUsdt?.toString() || '0');
  }

  async getWithdrawalUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal> {
    const aggregate = await prisma.transaction.aggregate({
      _sum: {
        amountUsdt: true,
      },
      where: {
        groupId,
        customerId,
        type: 'WITHDRAWAL',
      },
    });

    return new Decimal(aggregate._sum.amountUsdt?.toString() || '0');
  }

  async getAdjustmentUsdtSum(groupId: bigint, customerId: bigint): Promise<Decimal> {
    const aggregate = await prisma.transaction.aggregate({
      _sum: {
        amountUsdt: true,
      },
      where: {
        groupId,
        customerId,
        type: 'ADJUSTMENT',
      },
    });

    return new Decimal(aggregate._sum.amountUsdt?.toString() || '0');
  }

  async getTransactionHistory(groupId: bigint, customerId?: bigint, limit = 20) {
    const records = await prisma.transaction.findMany({
      where: {
        groupId,
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      type: r.type,
      groupId: r.groupId,
      customerId: r.customerId,
      operatorId: r.operatorId,
      amountVnd: new Decimal(r.amountVnd.toString()),
      feePercent: new Decimal(r.feePercent.toString()),
      feeAmountVnd: new Decimal(r.feeAmountVnd.toString()),
      netAmountVnd: new Decimal(r.netAmountVnd.toString()),
      exchangeRate: new Decimal(r.exchangeRate.toString()),
      amountUsdt: new Decimal(r.amountUsdt.toString()),
      createdAt: r.createdAt,
    }));
  }

  async getGroupSummaryReport(groupId: bigint): Promise<GroupSummaryReport> {
    const group = await prisma.telegramGroup.findUnique({
      where: { id: groupId },
    });

    const [depositAgg, withdrawalAgg, adjustmentAgg, customerCount, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: {
          amountVnd: true,
          netAmountVnd: true,
          amountUsdt: true,
        },
        where: { groupId, type: 'DEPOSIT' },
      }),
      prisma.transaction.aggregate({
        _sum: {
          amountUsdt: true,
        },
        where: { groupId, type: 'WITHDRAWAL' },
      }),
      prisma.transaction.aggregate({
        _sum: {
          amountUsdt: true,
        },
        where: { groupId, type: 'ADJUSTMENT' },
      }),
      prisma.groupCustomer.count({ where: { groupId } }),
      prisma.transaction.count({ where: { groupId } }),
    ]);

    const totalDepositVnd = new Decimal(depositAgg._sum.amountVnd?.toString() || '0');
    const totalNetDepositVnd = new Decimal(depositAgg._sum.netAmountVnd?.toString() || '0');
    const totalDepositUsdt = new Decimal(depositAgg._sum.amountUsdt?.toString() || '0');
    const totalWithdrawalUsdt = new Decimal(withdrawalAgg._sum.amountUsdt?.toString() || '0');
    const totalAdjustmentUsdt = new Decimal(adjustmentAgg._sum.amountUsdt?.toString() || '0');

    const remainingBalanceUsdt = totalDepositUsdt.sub(totalWithdrawalUsdt).add(totalAdjustmentUsdt);

    return {
      groupId,
      groupTitle: group?.title || 'Group',
      depositFeeRate: new Decimal(group?.defaultFeePercent.toString() || '0'),
      depositExchangeRate: new Decimal(group?.depositExchangeRate.toString() || '26859'),
      withdrawalExchangeRate: new Decimal(group?.withdrawalExchangeRate.toString() || '26309'),
      totalDepositVnd,
      totalNetDepositVnd,
      totalDepositUsdt,
      totalWithdrawalUsdt,
      remainingBalanceUsdt,
      customerCount,
      transactionCount,
    };
  }
}
