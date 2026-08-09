import { Context, MiddlewareFn } from 'telegraf';

export const requireOperator: MiddlewareFn<Context> = async (ctx, next) => {
  const fromUser = ctx.from;
  if (!fromUser) {
    return ctx.reply('❌ Không thể xác minh danh tính người dùng.');
  }

  // Allow in private chat (direct messages to bot)
  if (!ctx.chat || ctx.chat.type === 'private') {
    return next();
  }

  try {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some((admin) => admin.user.id === fromUser.id);

    if (!isAdmin) {
      return ctx.reply('⛔ Bạn không có quyền thực hiện thao tác này. Chỉ Quản trị viên (Admin) nhóm mới được phép.');
    }

    return next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return ctx.reply('❌ Không thể kiểm tra quyền hạn. Vui lòng thử lại sau.');
  }
};

