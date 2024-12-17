const { Telegraf } = require('telegraf');
const db = require('./firebase'); // Import the Firebase module

// Replace with your actual bot token from BotFather
const bot = new Telegraf('7769323799:AAFIrQgxFiDOZoF8FMe_ijMA9kcwM63LM58');

bot.start((ctx) => {
  const userName = ctx.from.first_name || "there"; // Use the user's first name or a default placeholder
  ctx.reply(`Welcome, ${userName}! 🤖

I’m Zeno Lend Game bot. Here are a few things you can do:
- Tap coins: /tap
- Supply coins: /supply
- Borrow coins: /borrow
- Repay your loan: /repay
-Distribute the lending prize: /distribute
- Check the leaderboard: /leaderboard
- View your rank: /myrank

Type any of these commands to get started!`);
});


// Command: /tap
bot.command('tap', async (ctx) => {
  const userId = ctx.from.id; // Telegram user ID
  const userRef = db.ref(`users/${userId}`);

  try {
    // Fetch current user balance or set default
    const snapshot = await userRef.once('value');
    const userData = snapshot.val() || { balance: 0, supply: 0, loan: 0 };

    // Increase balance by 1
    const newBalance = userData.balance + 1;

    // Update balance in Firebase
    await userRef.update({ balance: newBalance });

    // Notify the user
    ctx.reply(`You tapped the coin! Your balance is now: ${newBalance}`);
  } catch (error) {
    console.error('Error in /tap:', error);
    ctx.reply('Oops! Something went wrong.');
  }
});


bot.command('supply', async (ctx) => {
  console.log('Supply command received');

  const userId = ctx.from.id;
  const userRef = db.ref(`users/${userId}`);
  const bankRef = db.ref('bank');

  try {
    const amount = parseInt(ctx.message.text.split(' ')[1], 10);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('Please specify a valid amount to supply (greater than 0).');
    }

    const userSnapshot = await userRef.once('value');
    const bankSnapshot = await bankRef.once('value');
    
    // Set default values for user and bank data
    const userData = userSnapshot.val() || {};
    const bankData = bankSnapshot.val() || {};

    userData.balance = userData.balance || 0;
    userData.supply = userData.supply || 0;
    userData.loan = userData.loan || 0;

    bankData.totalSupply = bankData.totalSupply || 0;
    bankData.totalLoan = bankData.totalLoan || 0;

    console.log('User data:', userData);
    console.log('Bank data:', bankData);

    if (userData.balance < amount) {
      return ctx.reply('You don’t have enough balance to supply that amount.');
    }

    const newBalance = userData.balance - amount;
    const newSupply = userData.supply + amount;
    const newTotalSupply = bankData.totalSupply + amount;

    if (isNaN(newBalance) || isNaN(newSupply) || isNaN(newTotalSupply)) {
      console.error('Calculation error:', { newBalance, newSupply, newTotalSupply });
      return ctx.reply('An error occurred while processing your supply. Please try again.');
    }

    await userRef.update({ balance: newBalance, supply: newSupply });
    await bankRef.update({ totalSupply: newTotalSupply });

    ctx.reply(`You successfully supplied ${amount} coins. Your new supply is ${newSupply}.`);
  } catch (error) {
    console.error('Error in /supply:', error);
    ctx.reply('Something went wrong while supplying coins.');
  }
});


bot.command('borrow', async (ctx) => {
  console.log('Borrow command received');

  const userId = ctx.from.id;
  const userRef = db.ref(`users/${userId}`);
  const bankRef = db.ref('bank');

  try {
    const amount = parseInt(ctx.message.text.split(' ')[1], 10);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('Please specify a valid amount to borrow (greater than 0).');
    }

    const userSnapshot = await userRef.once('value');
    const bankSnapshot = await bankRef.once('value');

    // Set default values for user and bank data
    const userData = userSnapshot.val() || {};
    const bankData = bankSnapshot.val() || {};

    userData.balance = userData.balance || 0;
    userData.supply = userData.supply || 0;
    userData.loan = userData.loan || 0;

    bankData.totalSupply = bankData.totalSupply || 0;
    bankData.totalLoan = bankData.totalLoan || 0;

    console.log('User data:', userData);
    console.log('Bank data:', bankData);

    // Check if the user can borrow the requested amount
    const maxBorrow = Math.floor(userData.supply * 0.8);
    if (userData.loan + amount > maxBorrow) {
      return ctx.reply(`You can only borrow up to 80% of your supplied coins. Your max borrowable amount is ${maxBorrow - userData.loan}.`);
    }

    if (bankData.totalSupply < amount) {
      return ctx.reply('The bank does not have enough supply to fulfill your borrowing request.');
    }

    // Calculate new values
    const newLoan = userData.loan + amount;
    const newBalance = userData.balance + amount;
    const newTotalLoan = bankData.totalLoan + amount;
    const newTotalSupply = bankData.totalSupply - amount;

    if (isNaN(newLoan) || isNaN(newBalance) || isNaN(newTotalLoan) || isNaN(newTotalSupply)) {
      console.error('Calculation error:', { newLoan, newBalance, newTotalLoan, newTotalSupply });
      return ctx.reply('An error occurred while processing your loan. Please try again.');
    }

    // Update user and bank data
    await userRef.update({ balance: newBalance, loan: newLoan });
    await bankRef.update({ totalLoan: newTotalLoan, totalSupply: newTotalSupply });

    ctx.reply(`You successfully borrowed ${amount} coins. Your new balance is ${newBalance}.`);
  } catch (error) {
    console.error('Error in /borrow:', error);
    ctx.reply('Something went wrong while borrowing coins.');
  }
});


bot.command('repay', async (ctx) => {
  const userId = ctx.from.id;

  const usersRef = db.ref('users');
  const bankRef = db.ref('bank');
  const prizeRef = db.ref('prize');

  try {
    // Get user and bank data
    const usersSnapshot = await usersRef.once('value');
    const bankSnapshot = await bankRef.once('value');
    const prizeSnapshot = await prizeRef.once('value');

    const usersData = usersSnapshot.val() || {};
    const bankData = bankSnapshot.val() || {};
    const prizeData = prizeSnapshot.val() || { total: 0 };

    const user = usersData[userId] || { loan: 0, balance: 0 };

    // Ensure user has a loan
    if (user.loan <= 0) {
      return ctx.reply('You don\'t have any loan to repay.');
    }

    // Calculate interest (10%)
    const interest = user.loan * 0.1;
    const totalRepayment = user.loan + interest;

    // Ensure the user has enough balance to repay the loan + interest
    if (user.balance < totalRepayment) {
      return ctx.reply('You don\'t have enough balance to repay your loan with interest.');
    }

    // Update user's balance, loan, and prize pool
    const newBalance = user.balance - totalRepayment;
    const newLoan = 0;  // After repayment, the loan is cleared

    // Update the prize pool with the interest
    const newPrizeTotal = prizeData.total + interest;

    // Update the bank's total supply with the repaid loan
    const newBankTotalSupply = bankData.totalSupply + user.loan;

    // Update Firebase with the new data
    const updates = {};
    updates[`users/${userId}/balance`] = newBalance;
    updates[`users/${userId}/loan`] = newLoan;
    updates[`prize/total`] = newPrizeTotal;
    updates[`bank/totalSupply`] = newBankTotalSupply;

    await db.ref().update(updates);

    // Respond to the user
    ctx.reply(`You have repaid your loan of ${user.loan} coins with an interest of ${interest}. Your new balance is ${newBalance}. The interest has been added to the prize pool.`);
  } catch (error) {
    console.error('Error in /repay:', error);
    ctx.reply('Something went wrong while processing your repayment.');
  }
});


bot.command('distribute', async (ctx) => {
  console.log('Distribute command received');

  const bankRef = db.ref('bank');
  const prizeRef = db.ref('prize'); // Ensure this matches the naming in the `repay` code
  const usersRef = db.ref('users');

  try {
    const bankSnapshot = await bankRef.once('value');
    const prizeSnapshot = await prizeRef.once('value');
    const usersSnapshot = await usersRef.once('value');

    const bankData = bankSnapshot.val() || {};
    const prizeData = prizeSnapshot.val() || {};
    const usersData = usersSnapshot.val() || {};

    bankData.totalSupply = bankData.totalSupply || 0;
    prizeData.total = prizeData.total || 0;

    console.log('Bank data:', bankData);
    console.log('Prize data:', prizeData);
    console.log('Users data:', usersData);

    if (prizeData.total <= 0) {
      return ctx.reply('The Prize pool is empty. Nothing to distribute.');
    }

    if (bankData.totalSupply <= 0) {
      return ctx.reply('No supply in the bank to distribute the Prize pool.');
    }

    // Calculate and distribute rewards
    const updates = {};
    let totalDistributed = 0;

    Object.entries(usersData).forEach(([userId, user]) => {
      user.supply = user.supply || 0;

      if (user.supply > 0) {
        // Calculate reward
        const userReward = (user.supply / bankData.totalSupply) * prizeData.total;
        totalDistributed += userReward;

        // Update user's Prize account
        const currentPrize = parseFloat(user.Prize) || 0; // Convert existing Prize to a number
        const newPrize = currentPrize + userReward;
        updates[`users/${userId}/Prize`] = newPrize.toFixed(2); // Store only two decimal places
        console.log(`User ${userId} gets reward: ${userReward}`);
      }
    });

    // Reset Prize pool
    updates['prize/total'] = 0; // Ensure this matches the `repay` logic

    await db.ref().update(updates);

    ctx.reply(`Distributed ${totalDistributed.toFixed(2)} coins from the Prize pool among the suppliers. Rewards have been added to users' Prize accounts.`);
  } catch (error) {
    console.error('Error in /distribute:', error);
    ctx.reply('Something went wrong during the Prize pool distribution.');
  }
});


// 3. Leaderboard Code

// Function to update the leaderboard
const updateLeaderboard = async () => {
  const usersRef = db.ref('users');
  const leaderboardRef = db.ref('leaderboard');

  const usersSnapshot = await usersRef.once('value');
  const usersData = usersSnapshot.val() || {};

  let leaderboard = [];
  Object.entries(usersData).forEach(([userId, user]) => {
    const supply = user.supply || 0;
    const loan = user.loan || 0;
    const repayAmount = user.repayAmount || 0;
    const activityScore = supply + repayAmount - (loan * 0.5);

    leaderboard.push({ userId, activityScore });
  });

  leaderboard.sort((a, b) => b.activityScore - a.activityScore);
  const top200 = leaderboard.slice(0, 200);
  await leaderboardRef.set(top200);

  console.log('Leaderboard updated');
};

// Schedule leaderboard updates every hour
setInterval(updateLeaderboard, 60 * 60 * 1000); // 1-hour interval

// Command to display the top 200 leaderboard
bot.command('leaderboard', async (ctx) => {
  const leaderboardRef = db.ref('leaderboard');
  const leaderboardSnapshot = await leaderboardRef.once('value');
  const leaderboardData = leaderboardSnapshot.val() || [];

  let message = 'Top 200 Leaderboard:\n';
  leaderboardData.forEach((entry, index) => {
    message += `${index + 1}. User ${entry.userId}: ${entry.activityScore.toFixed(2)}\n`;
  });

  ctx.reply(message);
});

// Command to display the user's rank
bot.command('myrank', async (ctx) => {
  const userId = ctx.from.id;
  const leaderboardRef = db.ref('leaderboard');
  const leaderboardSnapshot = await leaderboardRef.once('value');
  const leaderboardData = leaderboardSnapshot.val() || [];

  const userRank = leaderboardData.findIndex((entry) => entry.userId == userId) + 1;

  if (userRank > 0) {
    ctx.reply(`Your rank is: ${userRank}`);
  } else {
    ctx.reply('You are not ranked on the leaderboard yet.');
  }
});


// Start the bot
bot.launch();
console.log('Bot is running. Use /tap, /supply <amount>, and /borrow <amount>.');
