import { Context, Markup } from 'telegraf';

export function setupStartCommand(bot: any) {
  bot.command(['start', 'help'], async (ctx: Context) => {
    // Xử lý riêng khi người dùng chat trực tiếp (private) với bot
    if (ctx.chat && ctx.chat.type === 'private') {
      const botUsername = ctx.botInfo.username;
      const addToGroupUrl = `https://t.me/${botUsername}?startgroup=true`;

      const privateKeyboard = Markup.inlineKeyboard([
        Markup.button.url('Nhấp vào đây để thêm robot vào nhóm. ↗️', addToGroupUrl)
      ]);

      const privateMsg = `Tôi là một robot kế toán.\n\nHãy thêm tôi vào nhóm của bạn để bắt đầu quản lý thu chi.`;
      
      return ctx.reply(privateMsg, privateKeyboard);
    }

    let msg = `🤖 **TELEGRAM MONEY BOT**
`;
    msg += `━━━━━━━━━━━━━━━━━━

`;
    msg += `📌 **LỆNH QUẢN LÝ:**
`;
    msg += `📥 Nạp tiền (Reply tin nhắn khách): \`/+\`
`;
    msg += `📤 Rút tiền (Reply tin nhắn khách): \`/-\`
`;
    msg += `💎 \`/balance\` : Xem số dư
`;
    msg += `📜 \`/history\` : Xem lịch sử
`;
    msg += `📊 \`/report\` : Báo cáo tổng quan
`;
    msg += `🔄 \`/reset\` : Reset số dư về 0 (Reply tin nhắn)

`;
    msg += `⚙️ **CÀI ĐẶT & TỶ GIÁ:**
`;
    msg += `🔹 \`/setfee <percent>\` : Đặt phí nạp mặc định (%)
`;
    msg += `🔹 \`/setdepositrate <giá>\` : Đặt tỷ giá nạp
`;
    msg += `🔹 \`/setwithdrawrate <giá>\` : Đặt tỷ giá rút
`;
    msg += `━━━━━━━━━━━━━━━━━━`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💎 Số dư', 'btn_balance'),
        Markup.button.callback('📜 Lịch sử', 'btn_history'),
      ],
      [
        Markup.button.callback('📊 Báo cáo', 'btn_report'),
      ],
    ]);

    return ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
  });

  // Action callbacks for buttons
  bot.action('btn_balance', async (ctx: Context) => {
    await ctx.answerCbQuery().catch(() => {});
    return ctx.reply('💎 Vui lòng gõ `/balance` trong Group để kiểm tra số dư.', { parse_mode: 'Markdown' });
  });

  bot.action('btn_history', async (ctx: Context) => {
    await ctx.answerCbQuery().catch(() => {});
    return ctx.reply('📜 Vui lòng gõ `/history` trong Group để xem lịch sử.', { parse_mode: 'Markdown' });
  });

  bot.action('btn_report', async (ctx: Context) => {
    await ctx.answerCbQuery().catch(() => {});
    return ctx.reply('📊 Vui lòng gõ `/report` trong Group để xem báo cáo tổng.', { parse_mode: 'Markdown' });
  });
}
