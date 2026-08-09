import Decimal from 'decimal.js';
import { formatVndDisplay, formatUsdtDisplay } from './decimal.js';

export function formatDepositResponse(params: {
  customerName: string;
  amountVnd: Decimal;
  feePercent: Decimal;
  netAmountVnd: Decimal;
  exchangeRate: Decimal;
  amountUsdt: Decimal;
  currentBalanceUsdt: Decimal;
  recentTransactions: Array<{
    type: string;
    createdAt: Date;
    amountVnd: Decimal;
    feePercent: Decimal;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
  }>;
}): string {
  const {
    customerName,
    amountVnd,
    feePercent,
    netAmountVnd,
    exchangeRate,
    amountUsdt,
    currentBalanceUsdt,
    recentTransactions,
  } = params;

  const grossUsdt = amountVnd.div(exchangeRate);
  const feeVnd = amountVnd.sub(netAmountVnd);
  const feeUsdt = grossUsdt.sub(amountUsdt);

  let msg = `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📥 NẠP TIỀN THÀNH CÔNG\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `👤 Customer: ${customerName}\n\n`;
  msg += `💰 Nạp:\n${formatUsdtDisplay(grossUsdt)} U | ${formatVndDisplay(amountVnd)} VND\n\n`;
  msg += `💸 Phí:\n${feePercent.toFixed(2)}% (~ ${formatUsdtDisplay(feeUsdt)} U | ${formatVndDisplay(feeVnd)} VND)\n\n`;
  msg += `💵 Sau phí:\n${formatUsdtDisplay(amountUsdt)} U | ${formatVndDisplay(netAmountVnd)} VND\n\n`;
  msg += `💱 Tỷ giá:\n${formatVndDisplay(exchangeRate)}\n\n`;
  msg += `🪙 Quy đổi:\n${formatUsdtDisplay(amountUsdt)} U\n\n`;
  msg += `💎 Số dư hiện tại:\n${formatUsdtDisplay(currentBalanceUsdt)} U | ${formatVndDisplay(currentBalanceUsdt.mul(exchangeRate))} VND\n\n`;
  msg += formatRecentTransactions(recentTransactions);

  return msg.trim();
}

export function formatWithdrawResponse(params: {
  customerName: string;
  previousBalanceUsdt: Decimal;
  withdrawVnd: Decimal;
  withdrawUsdt: Decimal;
  exchangeRate: Decimal;
  remainingBalanceUsdt: Decimal;
  recentTransactions: Array<{
    type: string;
    createdAt: Date;
    amountVnd: Decimal;
    feePercent: Decimal;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
  }>;
}): string {
  const { customerName, previousBalanceUsdt, withdrawVnd, withdrawUsdt, exchangeRate, remainingBalanceUsdt, recentTransactions } = params;

  let msg = `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📤 RÚT TIỀN THÀNH CÔNG\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `👤 Customer: ${customerName}\n\n`;
  msg += `💰 Số dư trước:\n${formatUsdtDisplay(previousBalanceUsdt)} U\n\n`;
  msg += `📤 Đã rút:\n${formatVndDisplay(withdrawVnd)} VND\n\n`;
  msg += `💱 Tỷ giá:\n${formatVndDisplay(exchangeRate)}\n\n`;
  msg += `🪙 Tương đương:\n${formatUsdtDisplay(withdrawUsdt)} U\n\n`;
  msg += `💎 Còn lại:\n${formatUsdtDisplay(remainingBalanceUsdt)} U | ${formatVndDisplay(remainingBalanceUsdt.mul(exchangeRate))} VND\n\n`;
  msg += formatRecentTransactions(recentTransactions);

  return msg.trim();
}

function formatRecentTransactions(
  recentTransactions: Array<{
    type: string;
    createdAt: Date;
    amountVnd: Decimal;
    feePercent: Decimal;
    exchangeRate: Decimal;
    amountUsdt: Decimal;
  }>
): string {
  let msg = `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📜 5 GIAO DỊCH GẦN NHẤT\n\n`;

  if (recentTransactions.length === 0) {
    msg += `(Chưa có giao dịch)\n`;
  } else {
    recentTransactions.forEach((tx) => {
      const timeStr = tx.createdAt.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      msg += `${timeStr}\n`;
      if (tx.type === 'DEPOSIT') {
        const feeFactor = new Decimal(1).sub(tx.feePercent.div(100)).toFixed(2);
        msg += `📥 Nạp: ${formatVndDisplay(tx.amountVnd)} × ${feeFactor} / ${formatVndDisplay(tx.exchangeRate)} = +${formatUsdtDisplay(tx.amountUsdt)} U\n\n`;
      } else if (tx.type === 'WITHDRAWAL') {
        msg += `📤 Rút: ${formatVndDisplay(tx.amountVnd)} / ${formatVndDisplay(tx.exchangeRate)} = -${formatUsdtDisplay(tx.amountUsdt)} U\n\n`;
      } else if (tx.type === 'ADJUSTMENT') {
        const prefix = tx.amountUsdt.isNegative() ? '' : '+';
        msg += `🔄 Điều chỉnh: ${prefix}${formatUsdtDisplay(tx.amountUsdt)} U\n\n`;
      } else {
        msg += `❓ Khác: ${formatUsdtDisplay(tx.amountUsdt)} U\n\n`;
      }
    });
  }
  return msg;
}
