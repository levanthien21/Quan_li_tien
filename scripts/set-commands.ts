import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN is not defined');
  process.exit(1);
}

const bot = new Telegraf(token);

async function setCommands() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'balance', description: '💎 Xem số dư hiện tại' },
      { command: 'history', description: '📜 Xem 5 giao dịch gần nhất' },
      { command: 'report', description: '📊 Báo cáo tổng quan' },
      { command: 'setrate', description: '⚙️ Cài đặt tỷ giá chung (Admin)' },
      { command: 'setfee', description: '⚙️ Cài đặt phí mặc định (Admin)' },
      { command: 'reset', description: '🔄 Reset số dư (Admin)' },
      { command: 'start', description: '🤖 Menu chính & Trợ giúp' }
    ]);
    console.log('✅ Commands set successfully!');
  } catch (err) {
    console.error('❌ Failed to set commands:', err);
  }
}

setCommands();
