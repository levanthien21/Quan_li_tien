const dotenv = require('dotenv');

dotenv.config();

const token = process.env.BOT_TOKEN;
const url = process.argv[2];

if (!token) {
  console.error('❌ BOT_TOKEN is missing in .env file!');
  process.exit(1);
}

if (!url) {
  console.error('❌ Please provide your Vercel URL.');
  console.error('Usage: node scripts/set-webhook.js https://your-vercel-domain.vercel.app');
  process.exit(1);
}

const webhookUrl = `${url.replace(/\/$/, '')}/api/webhook`;

async function setWebhook() {
  console.log(`Setting webhook to: ${webhookUrl}`);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Webhook was successfully set!');
    } else {
      console.error('❌ Failed to set webhook:', data.description);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setWebhook();
