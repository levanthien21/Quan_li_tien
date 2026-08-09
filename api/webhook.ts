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
