import { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot/bot.js';

// Cache bot instance across requests for faster warm starts
let botInstance: ReturnType<typeof createBot> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      if (!botInstance) {
        console.log('Initializing new bot instance...');
        botInstance = createBot();
        
        // Cấu hình menu lệnh nhanh
        botInstance.telegram.setMyCommands([
          { command: 'balance', description: '💎 Xem số dư hiện tại' },
          { command: 'history', description: '📜 Xem 5 giao dịch gần nhất' },
          { command: 'report', description: '📊 Báo cáo tổng quan' },
          { command: 'setrate', description: '⚙️ Cài đặt tỷ giá chung (Admin)' },
          { command: 'setfee', description: '⚙️ Cài đặt phí mặc định (Admin)' },
          { command: 'reset', description: '🔄 Reset số dư (Admin)' },
          { command: 'start', description: '🤖 Menu chính & Trợ giúp' }
        ]).catch(err => console.error('Error setting commands:', err));
      }
      
      // Process the webhook payload
      await botInstance.handleUpdate(req.body, res);
      
      // Ensure response is sent if handleUpdate didn't
      if (!res.writableEnded) {
        res.status(200).send('OK');
      }
    } catch (error) {
      console.error('Error handling webhook update:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    // A simple GET endpoint to verify the bot is alive
    res.status(200).send('Telegram Money Bot Vercel Webhook is active! 🚀');
  }
}
