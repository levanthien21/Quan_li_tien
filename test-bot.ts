import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.use((ctx, next) => {
  console.log('Received update:', ctx.updateType);
  return next();
});

bot.command('start', (ctx) => {
  console.log('Start command received. ctx.botInfo:', ctx.botInfo);
  if (ctx.chat && ctx.chat.type === 'private') {
    const botUsername = ctx.botInfo.username;
    console.log('Bot username:', botUsername);
    ctx.reply('Test success').catch(console.error);
  }
});

bot.launch().then(() => console.log('Bot started'));
