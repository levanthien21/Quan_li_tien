import Decimal from 'decimal.js';
import { prisma } from '../database/prisma.js';
import { IFeeRateRepository } from '../services/fee-rate.service.js';

export class GroupRepository implements IFeeRateRepository {
  async ensureGroup(groupId: bigint, title?: string, operatorId?: string) {
    return prisma.telegramGroup.upsert({
      where: { id: groupId },
      update: {
        ...(title ? { title } : {}),
        ...(operatorId ? { operatorId } : {}),
      },
      create: {
        id: groupId,
        title: title || 'Telegram Group',
        operatorId,
        defaultFeePercent: 0,
        depositExchangeRate: 0,
        withdrawalExchangeRate: 0,
      },
    });
  }

  async getGroup(groupId: bigint) {
    return prisma.telegramGroup.findUnique({
      where: { id: groupId },
    });
  }

  async updateDefaultFee(groupId: bigint, feePercent: Decimal) {
    return prisma.telegramGroup.update({
      where: { id: groupId },
      data: { defaultFeePercent: feePercent.toString() },
    });
  }

  async updateDepositRate(groupId: bigint, rate: Decimal) {
    return prisma.telegramGroup.update({
      where: { id: groupId },
      data: { depositExchangeRate: rate.toString() },
    });
  }

  async updateWithdrawalRate(groupId: bigint, rate: Decimal) {
    return prisma.telegramGroup.update({
      where: { id: groupId },
      data: { withdrawalExchangeRate: rate.toString() },
    });
  }

  async markFeeAsSet(groupId: bigint) {
    return prisma.telegramGroup.update({
      where: { id: groupId },
      data: { feeIsSet: true },
    });
  }

  async getFeeIsSet(groupId: bigint): Promise<boolean> {
    const group = await this.ensureGroup(groupId);
    return group.feeIsSet;
  }

  // IFeeRateRepository implementations
  async getCustomerFee(groupId: bigint, customerId: bigint): Promise<Decimal | null> {
    const gc = await prisma.groupCustomer.findUnique({
      where: {
        groupId_customerId: {
          groupId,
          customerId,
        },
      },
    });
    if (!gc || gc.customFeePercent === null) {
      return null;
    }
    return new Decimal(gc.customFeePercent.toString());
  }

  async getGroupDefaultFee(groupId: bigint): Promise<Decimal> {
    const group = await this.ensureGroup(groupId);
    return new Decimal(group.defaultFeePercent.toString());
  }

  async getGroupDepositRate(groupId: bigint): Promise<Decimal> {
    const group = await this.ensureGroup(groupId);
    return new Decimal(group.depositExchangeRate.toString());
  }

  async getGroupWithdrawalRate(groupId: bigint): Promise<Decimal> {
    const group = await this.ensureGroup(groupId);
    return new Decimal(group.withdrawalExchangeRate.toString());
  }

  /**
   * Alias for ensureGroup - get or create a group record.
   */
  async getOrCreateGroup(groupId: bigint, title?: string) {
    return this.ensureGroup(groupId, title);
  }

  /**
   * Alias for updateWithdrawalRate to match command naming.
   */
  async updateWithdrawRate(groupId: bigint, rate: Decimal) {
    return this.updateWithdrawalRate(groupId, rate);
  }
}
