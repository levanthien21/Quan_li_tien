import { prisma } from '../database/prisma.js';

export class OperatorRepository {
  async findByTelegramId(telegramId: bigint) {
    return prisma.operator.findUnique({
      where: { telegramId },
    });
  }

  async ensureOperator(telegramId: bigint, name: string, role = 'OPERATOR') {
    return prisma.operator.upsert({
      where: { telegramId },
      update: { name, role },
      create: { telegramId, name, role },
    });
  }

  async isOperator(telegramId: bigint): Promise<boolean> {
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (adminIds.includes(telegramId.toString())) {
      return true;
    }

    const op = await this.findByTelegramId(telegramId);
    return op !== null;
  }
  async removeOperator(telegramId: bigint) {
    return prisma.operator.deleteMany({
      where: { telegramId },
    });
  }

  async getAllOperators() {
    return prisma.operator.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
