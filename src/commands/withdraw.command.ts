import { Context } from 'telegraf';
import Decimal from 'decimal.js';
import { WithdrawalService, InsufficientBalanceError } from '../services/withdrawal.service.js';
import { RateNotSetError, FeeNotSetError } from '../services/fee-rate.service.js';
import { formatWithdrawResponse } from '../utils/formatter.js';
import { getTargetCustomer } from '../utils/telegram-helpers.js';

export function setupWithdrawCommand(bot: any, withdrawalService: WithdrawalService) {
  bot.hears(/^\/\-\s*([\d,.]+)\s*(u|usd)?/i, async (ctx: any) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const match = ctx.match;
      if (!match) return;

      const rawAmountStr = match[1].replace(/,/g, '');
      const amountNum = parseFloat(rawAmountStr);
      const isUsd = !!match[2];

      if (isNaN(amountNum) || amountNum <= 0) {
        return ctx.reply('❌ Số tiền rút không hợp lệ. Ví dụ: `/-100000` hoặc `/- 50u`');
      }

      const targetCustomer = getTargetCustomer(ctx);
      if (!targetCustomer) {
        return ctx.reply('❌ Không xác định được Customer. Vui lòng reply tin nhắn của Customer.');
      }

      const groupId = BigInt(ctx.chat.id);
      const operatorId = BigInt(ctx.from!.id);
      const amount = new Decimal(rawAmountStr);

      const result = await withdrawalService.processWithdrawal({
        groupId,
        customerId: targetCustomer.customerId,
        operatorId,
        amount,
        currency: isUsd ? 'USDT' : 'VND',
        telegramMessageId: BigInt(ctx.message!.message_id),
      });

      const responseText = formatWithdrawResponse({
        customerName: result.customerName,
        previousBalanceUsdt: result.previousBalanceUsdt,
        withdrawVnd: result.withdrawVnd,
        withdrawUsdt: result.withdrawUsdt,
        exchangeRate: result.exchangeRate,
        remainingBalanceUsdt: result.remainingBalanceUsdt,
        recentTransactions: result.recentTransactions,
      });

      return ctx.reply(responseText);
    } catch (error: any) {
      if (error instanceof FeeNotSetError || error instanceof RateNotSetError) {
        return ctx.reply(error.message, { parse_mode: 'Markdown' });
      }
      if (error instanceof InsufficientBalanceError) {
        return ctx.reply(`❌ RÚT TIỀN THẤT BẠI: Số dư không đủ!\n\n${error.message}`);
      }
      console.error('Error processing withdrawal:', error);
      return ctx.reply(`❌ Lỗi xử lý rút tiền: ${error.message || error}`);
    }
  });
}
