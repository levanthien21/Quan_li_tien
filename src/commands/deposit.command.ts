import { Context } from 'telegraf';
import Decimal from 'decimal.js';
import { DepositService } from '../services/deposit.service.js';
import { RateNotSetError, FeeNotSetError } from '../services/fee-rate.service.js';
import { formatDepositResponse } from '../utils/formatter.js';
import { getTargetCustomer } from '../utils/telegram-helpers.js';

export function setupDepositCommand(bot: any, depositService: DepositService) {
  bot.hears(/^\/\+\s*([\d,.]+)/, async (ctx: any) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const match = ctx.match;
      if (!match) return;

      const rawAmountStr = match[1].replace(/,/g, '');
      const amountNum = parseFloat(rawAmountStr);

      if (isNaN(amountNum) || amountNum <= 0) {
        return ctx.reply('❌ Số tiền nạp không hợp lệ. Ví dụ: `/+4000000`');
      }

      const targetCustomer = getTargetCustomer(ctx);
      if (!targetCustomer) {
        return ctx.reply('❌ Không xác định được Customer. Vui lòng reply tin nhắn của Customer.');
      }

      const groupId = BigInt(ctx.chat.id);
      const operatorId = BigInt(ctx.from!.id);
      const amountVnd = new Decimal(rawAmountStr);

      const result = await depositService.processDeposit({
        groupId,
        customerId: targetCustomer.customerId,
        operatorId,
        amountVnd,
        telegramMessageId: BigInt(ctx.message!.message_id),
      });

      const responseText = formatDepositResponse({
        customerName: result.customerName,
        amountVnd: result.amountVnd,
        feePercent: result.feePercent,
        netAmountVnd: result.netAmountVnd,
        exchangeRate: result.exchangeRate,
        amountUsdt: result.amountUsdt,
        currentBalanceUsdt: result.currentBalanceUsdt,
        recentTransactions: result.recentTransactions,
      });

      return ctx.reply(responseText);
    } catch (error: any) {
      if (error instanceof FeeNotSetError || error instanceof RateNotSetError) {
        return ctx.reply(error.message, { parse_mode: 'Markdown' });
      }
      console.error('Error processing deposit:', error);
      return ctx.reply(`❌ Lỗi xử lý nạp tiền: ${error.message || error}`);
    }
  });
}
