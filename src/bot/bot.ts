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

  // Security: Restrict who can add the bot to groups
  const allowedAdminsStr = process.env.ADMIN_TELEGRAM_IDS || '';
  const allowedAdmins = allowedAdminsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id !== '');

  bot.on('my_chat_member', async (ctx) => {
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const oldStatus = ctx.myChatMember.old_chat_member.status;
    const chatType = ctx.chat.type;

    // Triggered when bot is added to a group or supergroup
    if ((chatType === 'group' || chatType === 'supergroup') && 
        (newStatus === 'member' || newStatus === 'administrator') && 
        (oldStatus === 'left' || oldStatus === 'kicked')) {
        
      const adderId = ctx.from.id.toString();

      // If allowedAdmins array has items and adderId is not in it
      if (allowedAdmins.length > 0 && !allowedAdmins.includes(adderId)) {
        await ctx.reply('⚠️ Cảm ơn bạn đã thêm bot vào nhóm. Bot hiện đang bị khóa. Quản trị viên vui lòng gõ lệnh `/activate <mật_khẩu>` để kích hoạt sử dụng.', { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('✅ Cảm ơn bạn đã thêm bot vào nhóm. Bot hiện đang bị khóa. Bạn là Quản trị viên, vui lòng gõ lệnh `/activate <mật_khẩu>` để kích hoạt.', { parse_mode: 'Markdown' });
      }
    }
  });

  // Activate Command
  bot.command('activate', async (ctx) => {
    if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
    }

    try {
      // Must be a group admin to activate
      const fromUser = ctx.from;
      if (!fromUser) return;

      const admins = await ctx.getChatAdministrators();
      const isAdmin = admins.some((admin) => admin.user.id === fromUser.id);

      if (!isAdmin) {
        return ctx.reply('⛔ Chỉ Quản trị viên (Admin) của nhóm mới có quyền kích hoạt Bot.');
      }

      const text = ctx.message && 'text' in ctx.message ? (ctx.message as any).text : '';
      const password = text.replace('/activate', '').trim();

      if (!password) {
        return ctx.reply('❌ Vui lòng nhập mật khẩu. Cú pháp: `/activate <mật_khẩu>`', { parse_mode: 'Markdown' });
      }

      const correctPassword = process.env.ADMIN_TELEGRAM_IDS || '';
      
      if (password === correctPassword) {
        const groupId = BigInt(ctx.chat.id);
        await groupRepo.activateGroup(groupId);
        return ctx.reply('✅ Kích hoạt thành công! Bot đã sẵn sàng hoạt động trong nhóm này. Chúc bạn sử dụng hiệu quả.');
      } else {
        return ctx.reply('❌ Mật khẩu kích hoạt không chính xác. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error activating group:', error);
      return ctx.reply('❌ Có lỗi xảy ra trong quá trình kích hoạt.');
    }
  });

  // Setup Commands
  setupStartCommand(bot);
  setupBalanceCommand(bot, balanceService, groupRepo);

  // Protected Operator Commands
  bot.use(async (ctx, next) => {
    const text = ctx.message && 'text' in ctx.message ? (ctx.message as any).text : '';
    const protectedCommands = ['/reset', '/reset2', '/resetall', '/setfee', '/setrate', '/report'];
    
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
