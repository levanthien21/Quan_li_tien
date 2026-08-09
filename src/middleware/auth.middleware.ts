import { Context, MiddlewareFn } from 'telegraf';
import { OperatorRepository } from '../repositories/operator.repository.js';

const operatorRepo = new OperatorRepository();

export const requireOperator: MiddlewareFn<Context> = async (ctx, next) => {
  const fromUser = ctx.from;
  if (!fromUser) {
    return ctx.reply('❌ Không thể xác minh danh tính người dùng.');
  }

  try {
    const isOp = await operatorRepo.isOperator(BigInt(fromUser.id));

    if (!isOp) {
      return ctx.reply('⛔ Bot đang ở chế độ riêng tư. Bạn chưa được cấp phép sử dụng Bot này.');
    }

    return next();
  } catch (error) {
    console.error('Error checking operator status:', error);
    return ctx.reply('❌ Không thể kiểm tra quyền hạn. Vui lòng thử lại sau.');
  }
};

