import { Context, MiddlewareFn } from 'telegraf';
import { GroupRepository } from '../repositories/group.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';

const groupRepo = new GroupRepository();
const customerRepo = new CustomerRepository();

export const ensureGroupAndUserContext: MiddlewareFn<Context> = async (ctx, next) => {
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    const groupId = BigInt(ctx.chat.id);
    const groupTitle = 'title' in ctx.chat ? ctx.chat.title : 'Telegram Group';
    const group = await groupRepo.ensureGroup(groupId, groupTitle);

    // If group is not active, block all commands except /activate
    const text = ctx.message && 'text' in ctx.message ? (ctx.message as any).text : '';
    if (!group.isActive && !text.startsWith('/activate')) {
      // Send a warning message if it looks like a command. 
      // To avoid spamming on every normal message, we only warn on commands.
      if (text.startsWith('/')) {
        await ctx.reply('❌ Bot chưa được kích hoạt trong nhóm này. Vui lòng liên hệ Admin sử dụng lệnh `/activate <mật_khẩu>` để kích hoạt.', { parse_mode: 'Markdown' });
      }
      return; // Stop processing middleware chain
    }

    if (ctx.from) {
      const customerId = BigInt(ctx.from.id);
      await customerRepo.ensureCustomer({
        id: customerId,
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
      });
      await customerRepo.linkCustomerToGroup(groupId, customerId);
    }
  }

  return next();
};
