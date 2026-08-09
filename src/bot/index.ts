import { createBot } from './bot.js';

async function main() {
  console.log('🚀 Starting Telegram Money Bot...');
  const bot = createBot();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  try {
    // Fetch bot info first to verify connection
    const botInfo = await bot.telegram.getMe();
    
    // Set bot commands menu
    await bot.telegram.setMyCommands([
      { command: 'balance', description: '💎 Xem số dư hiện tại' },
      { command: 'history', description: '📜 Xem 5 giao dịch gần nhất' },
      { command: 'report', description: '📊 Báo cáo tổng quan' },
      { command: 'setrate', description: '⚙️ Cài đặt tỷ giá chung (Admin)' },
      { command: 'setfee', description: '⚙️ Cài đặt phí mặc định (Admin)' },
      { command: 'reset', description: '🔄 Reset số dư 1 khách (Admin)' },
      { command: 'reset2', description: '🧹 Làm mới toàn bộ GD (Admin)' },
      { command: 'start', description: '🤖 Menu chính & Trợ giúp' }
    ]);

    // Launch long polling without awaiting resolution (since bot.launch() blocks until bot.stop())
    bot.launch().catch((error) => {
      console.error('❌ Error during long polling:', error);
    });

    console.log(`✅ Telegram Money Bot (@${botInfo.username}) is running successfully!`);
    console.log(`🤖 Bot Name: ${botInfo.first_name}`);
    console.log(`📡 Status: Listening for Telegram group commands...`);
  } catch (error) {
    console.error('❌ Failed to launch Telegram Bot:', error);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
