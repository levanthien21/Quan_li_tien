import { Context } from 'telegraf';
import Decimal from 'decimal.js';
import { GroupRepository } from '../repositories/group.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { formatVndDisplay } from '../utils/decimal.js';
import { getTargetCustomer } from '../utils/telegram-helpers.js';

export function setupConfigCommands(
  bot: any,
  groupRepo: GroupRepository,
  customerRepo: CustomerRepository
) {
  // 1. /setfee <percent>
  bot.command('setfee', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const text = 'text' in ctx.message! ? ctx.message.text : '';
      const args = text.split(/\s+/).slice(1);

      if (args.length === 0) {
        return ctx.reply(
          '⚠️ Cú pháp: `/setfee <phí_%>`\nVí dụ: `/setfee 5` (Đặt phí mặc định Group 5%)\nHoặc reply tin nhắn của khách để cài phí riêng.',
          { parse_mode: 'Markdown' }
        );
      }

      const feePercent = new Decimal(args[0]);
      if (feePercent.isNegative() || feePercent.greaterThan(100)) {
        return ctx.reply('❌ Phí dịch vụ phải từ 0% đến 100%.');
      }

      const groupId = BigInt(ctx.chat.id);
      const isReply = 'reply_to_message' in ctx.message! && ctx.message.reply_to_message;

      if (isReply) {
        const target = getTargetCustomer(ctx);
        if (target) {
          await customerRepo.setCustomCustomerFee(groupId, target.customerId, feePercent);
          return ctx.reply(`✅ Đã cài đặt phí dịch vụ riêng cho **${target.customerName}**: ${feePercent.toFixed(2)}%`, {
            parse_mode: 'Markdown',
          });
        }
      }

      // Group default fee
      await groupRepo.updateDefaultFee(groupId, feePercent);
      await groupRepo.markFeeAsSet(groupId);
      return ctx.reply(`✅ Đã cập nhật phí dịch vụ mặc định của Group: ${feePercent.toFixed(2)}%`);
    } catch (error: any) {
      console.error('Error in setfee:', error);
      return ctx.reply(`❌ Lỗi cài đặt phí: ${error.message || error}`);
    }
  });

  // 2. /setdepositrate <rate> - Cài tỷ giá nạp thủ công
  bot.command('setdepositrate', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const text = 'text' in ctx.message! ? ctx.message.text : '';
      const args = text.split(/\s+/).slice(1);

      if (args.length === 0) {
        return ctx.reply('⚠️ Cú pháp: `/setdepositrate <tỷ_giá>`\nVí dụ: `/setdepositrate 25500`', {
          parse_mode: 'Markdown',
        });
      }

      const rate = new Decimal(args[0].replace(/,/g, ''));
      if (rate.lessThanOrEqualTo(0)) {
        return ctx.reply('❌ Tỷ giá phải lớn hơn 0.');
      }

      const groupId = BigInt(ctx.chat.id);
      await groupRepo.updateDepositRate(groupId, rate);
      return ctx.reply(`✅ Đã cập nhật tỷ giá nạp: **${formatVndDisplay(rate)} VND/USDT**`, {
        parse_mode: 'Markdown',
      });
    } catch (error: any) {
      console.error('Error in setdepositrate:', error);
      return ctx.reply(`❌ Lỗi cài đặt tỷ giá nạp: ${error.message || error}`);
    }
  });

  // 3. /setwithdrawrate <rate> - Cài tỷ giá rút thủ công
  bot.command('setwithdrawrate', async (ctx: Context) => {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return ctx.reply('❌ Lệnh này chỉ áp dụng trong Telegram Group.');
      }

      const text = 'text' in ctx.message! ? ctx.message.text : '';
      const args = text.split(/\s+/).slice(1);

      if (args.length === 0) {
        return ctx.reply('⚠️ Cú pháp: `/setwithdrawrate <tỷ_giá>`\nVí dụ: `/setwithdrawrate 24500`', {
          parse_mode: 'Markdown',
        });
      }

      const rate = new Decimal(args[0].replace(/,/g, ''));
      if (rate.lessThanOrEqualTo(0)) {
        return ctx.reply('❌ Tỷ giá phải lớn hơn 0.');
      }

      const groupId = BigInt(ctx.chat.id);
      await groupRepo.updateWithdrawRate(groupId, rate);
      return ctx.reply(`✅ Đã cập nhật tỷ giá rút: **${formatVndDisplay(rate)} VND/USDT**`, {
        parse_mode: 'Markdown',
      });
    } catch (error: any) {
      console.error('Error in setwithdrawrate:', error);
      return ctx.reply(`❌ Lỗi cài đặt tỷ giá rút: ${error.message || error}`);
    }
  });
}
