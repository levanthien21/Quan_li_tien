import { Context, MiddlewareFn } from 'telegraf';
import { GroupRepository } from '../repositories/group.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';

const groupRepo = new GroupRepository();
const customerRepo = new CustomerRepository();

export const ensureGroupAndUserContext: MiddlewareFn<Context> = async (ctx, next) => {
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    const groupId = BigInt(ctx.chat.id);
    const groupTitle = 'title' in ctx.chat ? ctx.chat.title : 'Telegram Group';
    await groupRepo.ensureGroup(groupId, groupTitle);

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
