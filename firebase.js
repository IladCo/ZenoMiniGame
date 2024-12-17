const { Telegraf } = require('telegraf');
const db = require('./firebase'); // Import the Firebase module

// Replace with your actual bot token from BotFather
const bot = new Telegraf('7769323799:AAFIrQgxFiDOZoF8FMe_ijMA9kcwM63LM58');

// Command to test Firebase
bot.command('testfirebase', async (ctx) => {
  try {
    // Write a test message to Firebase
    await db.ref('test').set({ message: 'Firebase is working via Telegram bot!' });

    // Send a confirmation to the user
    ctx.reply('Firebase initialized and test data written successfully!');
  } catch (error) {
    console.error('Error writing to Firebase:', error);
    ctx.reply('There was an error initializing Firebase.');
  }
});

// Start the bot
bot.launch();
console.log('Bot is running. Send /testfirebase to test Firebase.');
