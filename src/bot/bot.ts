import { Telegraf } from 'telegraf';
import Decimal from 'decimal.js';
import dotenv from 'dotenv';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { FeeRateService } from '../services/fee-rate.service.js';
import { BalanceService } from '../services/balance.service.js';
import { DepositService } from '../services/deposit.service.js';
import { WithdrawalService } from '../services/withdrawal.service.js';
import { WithdrawalCalculationService } from '../services/withdrawal-calc.service.js';

import { ensureGroupAndUserContext } from '../middleware/group-context.middleware.js';
import { requireOperator } from '../middleware/auth.middleware.js';

import { setupStartCommand } from '../commands/start.command.js';
import { setupDepositCommand } from '../commands/deposit.command.js';
import { setupWithdrawCommand } from '../commands/withdraw.command.js';
import { setupBalanceCommand } from '../commands/balance.command.js';
import { setupConfigCommands } from '../commands/config.command.js';
import { setupReportAndHistoryCommands } from '../commands/report.command.js';
import { setupResetCommand } from '../commands/reset.command.js';

dotenv.config();

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN environment variable is not defined.');
  }

  const bot = new Telegraf(token);

  // Initialize repositories
  const customerRepo = new CustomerRepository();
  const groupRepo = new GroupRepository();
  const transactionRepo = new TransactionRepository(customerRepo);

  // Initialize domain services
  const feeRateService = new FeeRateService(groupRepo);
  const balanceService = new BalanceService(transactionRepo);
  const depositService = new DepositService(transactionRepo, feeRateService, balanceService);
  const calcService = new WithdrawalCalculationService();
  const withdrawalService = new WithdrawalService(transactionRepo, balanceService, feeRateService, calcService);

  // Middlewares
  bot.use(ensureGroupAndUserContext);

  // Setup Commands
  setupStartCommand(bot);
  setupBalanceCommand(bot, balanceService, groupRepo);

  // Protected Operator Commands
  bot.use(async (ctx, next) => {
    const text = ctx.message && 'text' in ctx.message ? (ctx.message as any).text : '';
    const protectedCommands = ['/reset', '/setfee', '/setdepositrate', '/setwithdrawrate', '/setrate', '/report'];
    
    // Check if it's a protected command or starts with + / - followed by number
    const isProtected = protectedCommands.some((cmd) => text.startsWith(cmd)) || /^\/[+-]\s*[\d,.]+/.test(text);

    if (isProtected) {
      return requireOperator(ctx, next);
    }
    return next();
  });

  setupDepositCommand(bot, depositService);
  setupWithdrawCommand(bot, withdrawalService);
  setupConfigCommands(bot, groupRepo, customerRepo);
  setupReportAndHistoryCommands(bot, transactionRepo);
  setupResetCommand(bot, transactionRepo, balanceService);

  bot.catch((err, ctx) => {
    console.error(`❌ Ooops, encountered an error for ${ctx.updateType}`, err);
  });

  return bot;
}
