import Decimal from 'decimal.js';
import { prisma } from '../database/prisma.js';

export class CustomerRepository {
  async ensureCustomer(params: {
    id: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const customer = await prisma.customer.upsert({
      where: { id: params.id },
      update: {
        username: params.username,
        firstName: params.firstName,
        lastName: params.lastName,
      },
      create: {
        id: params.id,
        username: params.username,
        firstName: params.firstName,
        lastName: params.lastName,
      },
    });

    return customer;
  }

  async linkCustomerToGroup(groupId: bigint, customerId: bigint) {
    return prisma.groupCustomer.upsert({
      where: {
        groupId_customerId: {
          groupId,
          customerId,
        },
      },
      update: {},
      create: {
        groupId,
        customerId,
      },
    });
  }

  async setCustomCustomerFee(groupId: bigint, customerId: bigint, feePercent: Decimal) {
    await this.linkCustomerToGroup(groupId, customerId);
    return prisma.groupCustomer.update({
      where: {
        groupId_customerId: {
          groupId,
          customerId,
        },
      },
      data: {
        customFeePercent: feePercent.toString(),
      },
    });
  }

  async getCustomerDisplayName(customerId: bigint): Promise<string> {
    const cust = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!cust) return `User ${customerId}`;
    if (cust.firstName || cust.lastName) {
      return [cust.firstName, cust.lastName].filter(Boolean).join(' ');
    }
    if (cust.username) {
      return `@${cust.username}`;
    }
    return `User ${customerId}`;
  }
}
