import { Context } from 'telegraf';
import { BalanceService } from '../services/balance.service.js';
import { getTargetCustomer } from '../utils/telegram-helpers.js';
import { formatUsdtDisplay } from '../utils/decimal.js';

export function setupBalanceCommand(bot: any, balanceService: BalanceService) {
  bot.command(['balance', 'sodu'], async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const targetCustomer = getTargetCustomer(ctx);
      if (!targetCustomer) {
        return ctx.reply('❌ Không xác minh được Customer.');
      }

      const groupId = BigInt(ctx.chat.id);
      const balanceUsdt = await balanceService.getCustomerBalanceUsdt(groupId, targetCustomer.customerId);

      let msg = `💎 SỐ DƯ HIỆN TẠI\n\n`;
      msg += `👤 Customer: ${targetCustomer.customerName}\n`;
      msg += `🪙 Số dư USDT: ${formatUsdtDisplay(balanceUsdt)} U`;

      return ctx.reply(msg);
    } catch (error: any) {
      console.error('Error getting balance:', error);
      return ctx.reply(`❌ Lỗi tra cứu số dư: ${error.message || error}`);
    }
  });
}
