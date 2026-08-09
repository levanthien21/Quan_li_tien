import { Context } from 'telegraf';
import Decimal from 'decimal.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { BalanceService } from '../services/balance.service.js';
import { getTargetCustomer } from '../utils/telegram-helpers.js';
import { formatUsdtDisplay } from '../utils/decimal.js';

export function setupResetCommand(bot: any, transactionRepo: TransactionRepository, balanceService: BalanceService) {
  bot.command('reset', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const targetCustomer = getTargetCustomer(ctx);
      if (!targetCustomer) {
        return ctx.reply('❌ Không xác định được Customer. Vui lòng reply tin nhắn của Customer.');
      }

      const groupId = BigInt(ctx.chat.id);
      const customerId = targetCustomer.customerId;
      const operatorId = BigInt(ctx.from!.id);

      const currentBalanceUsdt = await balanceService.getCustomerBalanceUsdt(groupId, customerId);

      if (currentBalanceUsdt.equals(0)) {
        return ctx.reply(`⚖️ Số dư của khách hàng đã là 0 U.`);
      }

      // Create an ADJUSTMENT transaction to offset the balance
      const adjustmentAmountUsdt = currentBalanceUsdt.negated();

      await transactionRepo.createTransaction({
        groupId,
        customerId,
        operatorId,
        type: 'ADJUSTMENT',
        amountVnd: new Decimal(0),
        feePercent: new Decimal(0),
        feeAmountVnd: new Decimal(0),
        netAmountVnd: new Decimal(0),
        exchangeRate: new Decimal(0),
        amountUsdt: adjustmentAmountUsdt,
        telegramMessageId: BigInt(ctx.message!.message_id),
        note: 'Reset balance to 0',
      });

      const customerName = await transactionRepo.getCustomerName(customerId);

      return ctx.reply(
        `🔄 **RESET SỐ DƯ THÀNH CÔNG**\n━━━━━━━━━━━━━━━━━━\n👤 Customer: ${customerName}\n⚖️ Đã điều chỉnh: ${formatUsdtDisplay(adjustmentAmountUsdt)} U\n💎 Số dư hiện tại: 0 U`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      console.error('Error resetting balance:', error);
      return ctx.reply(`❌ Lỗi khi reset số dư: ${error.message || error}`);
    }
  });

  bot.command(['reset2', 'resetall'], async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const groupId = BigInt(ctx.chat.id);
      
      const count = await transactionRepo.deleteAllTransactionsInGroup(groupId);

      return ctx.reply(
        `🧹 **LÀM MỚI DỮ LIỆU THÀNH CÔNG**\n━━━━━━━━━━━━━━━━━━\n✅ Đã xóa toàn bộ ${count} giao dịch trong nhóm này. Dữ liệu đã được reset về 0.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      console.error('Error resetting all transactions:', error);
      return ctx.reply(`❌ Lỗi khi làm mới dữ liệu: ${error.message || error}`);
    }
  });
}
