import { Context } from 'telegraf';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { formatVndDisplay, formatUsdtDisplay } from '../utils/decimal.js';

export function setupReportAndHistoryCommands(
  bot: any,
  transactionRepo: TransactionRepository
) {
  // /report
  bot.command('report', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const groupId = BigInt(ctx.chat.id);
      const summary = await transactionRepo.getGroupSummaryReport(groupId);

      let msg = `📊 BÁO CÁO TỔNG QUAN GROUP\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `🏘️ Group: ${summary.groupTitle}\n`;
      msg += `👥 Tổng số khách hàng: ${summary.customerCount}\n`;
      msg += `📝 Tổng số giao dịch: ${summary.transactionCount}\n\n`;
      msg += `⚙️ Phí nạp (Fee Rate): ${summary.depositFeeRate.toFixed(2)}%\n`;
      msg += `💱 Tỷ giá Nạp (Deposit Rate): ${formatVndDisplay(summary.depositExchangeRate)}\n`;
      msg += `💱 Tỷ giá Rút (Withdraw Rate): ${formatVndDisplay(summary.withdrawalExchangeRate)}\n\n`;
      msg += `📥 Tổng tiền nạp (VND): ${formatVndDisplay(summary.totalDepositVnd)} VND\n`;
      msg += `💵 Tổng thực nhận (VND): ${formatVndDisplay(summary.totalNetDepositVnd)} VND\n`;
      msg += `🪙 Tổng nạp (USDT): ${formatUsdtDisplay(summary.totalDepositUsdt)} U\n`;
      msg += `📤 Tổng đã rút (USDT): ${formatUsdtDisplay(summary.totalWithdrawalUsdt)} U\n\n`;
      msg += `💎 DƯ NỢ CÒN LẠI (USDT): ${formatUsdtDisplay(summary.remainingBalanceUsdt)} U\n`;
      msg += `━━━━━━━━━━━━━━━━━━`;

      return ctx.reply(msg);
    } catch (error: any) {
      console.error('Error getting report:', error);
      return ctx.reply(`❌ Lỗi tạo báo cáo: ${error.message || error}`);
    }
  });

  // /history
  bot.command('history', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const groupId = BigInt(ctx.chat.id);
      const records = await transactionRepo.getTransactionHistory(groupId, undefined, 15);

      if (records.length === 0) {
        return ctx.reply('📜 Lịch sử giao dịch trống.');
      }

      let msg = `📜 LỊCH SỬ GIAO DỊCH GẦN NHẤT\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n\n`;

      records.forEach((r, idx) => {
        const dateStr = r.createdAt.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const icon = r.type === 'DEPOSIT' ? '📥' : r.type === 'WITHDRAWAL' ? '📤' : '⚖️';
        msg += `${idx + 1}. ${icon} [${r.type}] - ${dateStr}\n`;
        if (r.type === 'DEPOSIT' || r.type === 'ADJUSTMENT') {
          msg += `   VND: ${formatVndDisplay(r.amountVnd)} (Phí ${r.feePercent}% -> Net: ${formatVndDisplay(r.netAmountVnd)})\n`;
          msg += `   USDT: ${formatUsdtDisplay(r.amountUsdt)} U (Tỷ giá: ${formatVndDisplay(r.exchangeRate)})\n`;
        } else {
          msg += `   Rút USDT: ${formatUsdtDisplay(r.amountUsdt)} U (Tỷ giá: ${formatVndDisplay(r.exchangeRate)})\n`;
        }
        msg += `\n`;
      });

      return ctx.reply(msg);
    } catch (error: any) {
      console.error('Error getting history:', error);
      return ctx.reply(`❌ Lỗi xem lịch sử: ${error.message || error}`);
    }
  });
}
