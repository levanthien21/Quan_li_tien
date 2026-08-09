import { Context } from 'telegraf';

export interface TargetCustomerInfo {
  customerId: bigint;
  customerName: string;
}

/**
 * Extracts target Customer from reply message or current user
 */
export function getTargetCustomer(ctx: Context): TargetCustomerInfo | null {
  const msg = ctx.message;
  if (!msg) return null;

  // Check if operator replied to a customer's message
  if ('reply_to_message' in msg && msg.reply_to_message && msg.reply_to_message.from) {
    const from = msg.reply_to_message.from;
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || `@${from.username}` || `User ${from.id}`;
    return {
      customerId: BigInt(from.id),
      customerName: name,
    };
  }

  // Fallback to sender of current message
  if (ctx.from) {
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || `@${ctx.from.username}` || `User ${ctx.from.id}`;
    return {
      customerId: BigInt(ctx.from.id),
      customerName: name,
    };
  }

  return null;
}
