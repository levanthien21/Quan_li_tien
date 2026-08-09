import { Telegraf, Context } from 'telegraf';
import { OperatorRepository } from '../repositories/operator.repository.js';

const operatorRepo = new OperatorRepository();

// Middleware to protect these specific commands (Only Super Admins in .env)
const isSuperAdmin = (ctx: Context) => {
  const fromUser = ctx.from;
  if (!fromUser) return false;
  
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
    
  return adminIds.includes(fromUser.id.toString());
};

export function setupOperatorCommands(bot: Telegraf<Context>) {
  // Command to add an operator
  bot.command('addop', async (ctx) => {
    if (!isSuperAdmin(ctx)) {
      return ctx.reply('⛔ Chỉ Super Admin (khai báo trong .env) mới có quyền dùng lệnh này.');
    }

    const messageText = ctx.message.text.trim();
    // format: /addop <id> <name>
    const match = messageText.match(/^\/addop\s+(\d+)(?:\s+(.+))?/);
    if (!match) {
      return ctx.reply('❌ Cú pháp sai. Hãy dùng: /addop <Telegram_ID> <Tên người dùng>');
    }

    const telegramId = BigInt(match[1]);
    const name = match[2] || `Operator_${match[1]}`;

    try {
      await operatorRepo.ensureOperator(telegramId, name);
      return ctx.reply(`✅ Đã cấp quyền sử dụng Bot cho tài khoản ID: ${telegramId.toString()} (${name})`);
    } catch (error) {
      console.error('Error adding operator:', error);
      return ctx.reply('❌ Đã xảy ra lỗi khi cấp quyền.');
    }
  });

  // Command to remove an operator
  bot.command('removeop', async (ctx) => {
    if (!isSuperAdmin(ctx)) {
      return ctx.reply('⛔ Chỉ Super Admin mới có quyền dùng lệnh này.');
    }

    const messageText = ctx.message.text.trim();
    // format: /removeop <id>
    const match = messageText.match(/^\/removeop\s+(\d+)/);
    if (!match) {
      return ctx.reply('❌ Cú pháp sai. Hãy dùng: /removeop <Telegram_ID>');
    }

    const telegramId = BigInt(match[1]);

    try {
      await operatorRepo.removeOperator(telegramId);
      return ctx.reply(`🗑️ Đã thu hồi quyền sử dụng Bot của tài khoản ID: ${telegramId.toString()}`);
    } catch (error) {
      console.error('Error removing operator:', error);
      return ctx.reply('❌ Đã xảy ra lỗi khi thu hồi quyền.');
    }
  });

  // Command to list operators
  bot.command('listop', async (ctx) => {
    if (!isSuperAdmin(ctx)) {
      return ctx.reply('⛔ Chỉ Super Admin mới có quyền dùng lệnh này.');
    }

    try {
      const ops = await operatorRepo.getAllOperators();
      if (ops.length === 0) {
        return ctx.reply('📋 Hiện chưa có tài khoản nào được cấp phép ngoài Super Admin.');
      }

      let replyMsg = '📋 Danh sách tài khoản được phép dùng Bot:\n\n';
      ops.forEach((op, index) => {
        replyMsg += `${index + 1}. Tên: ${op.name} - ID: ${op.telegramId}\n`;
      });

      return ctx.reply(replyMsg);
    } catch (error) {
      console.error('Error listing operators:', error);
      return ctx.reply('❌ Đã xảy ra lỗi khi lấy danh sách.');
    }
  });
}
