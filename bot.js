const { Telegraf } = require('telegraf');
const express = require('express');
const db = require('./firebase'); // Import the Firebase module
const bodyParser = require('body-parser');

const bot = new Telegraf('7769323799:AAFIrQgxFiDOZoF8FMe_ijMA9kcwM63LM58');
const app = express();
app.use(bodyParser.json());

bot.start((ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || "there";
  ctx.reply(`Welcome, ${userName}! Your user ID is ${userId}. 🤖\n\nI’m Zeno Lend Game bot. Use the front-end buttons to interact.`);
});


// Existing POST route to update the user balance when the game ends
app.post('/update-balance', async (req, res) => {
  const { userId, amount } = req.body;  // Expect userId and the final amount sent from the game
  
  const userRef = db.ref(`users/${userId}`);

  try {
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};  // If no user data found, default to empty object

    // Update balance by adding the amount from the game session
    const newBalance = (userData.balance || 0) + amount;
    await userRef.update({ balance: newBalance });

    res.json({ message: `Balance updated by ${amount}. New balance: ${newBalance}` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating balance.' });
  }
});

// Supply API to lend coins to the bank
app.post('/api/supply', async (req, res) => {
  const { userId, amount } = req.body;
  const userRef = db.ref(`users/${userId}`);
  const bankRef = db.ref('bank');

  try {
    const userSnapshot = await userRef.once('value');
    const bankSnapshot = await bankRef.once('value');

    const userData = userSnapshot.val() || {};
    const bankData = bankSnapshot.val() || {};

    if (userData.balance < amount) {
      return res.json({ message: 'Not enough balance to supply.' });
    }

    const newBalance = userData.balance - amount;
    const newSupply = (userData.supply || 0) + amount;
    const newTotalSupply = (bankData.totalSupply || 0) + amount;

    await userRef.update({ balance: newBalance, supply: newSupply });
    await bankRef.update({ totalSupply: newTotalSupply });

    res.json({ message: `Supplied ${amount} coins.` });
  } catch (error) {
    res.status(500).json({ message: 'Supply error.' });
  }
});

// Borrow API
app.post('/api/borrow', async (req, res) => {
  const { userId, amount } = req.body;
  const userRef = db.ref(`users/${userId}`);
  const bankRef = db.ref('bank');

  try {
    const userSnapshot = await userRef.once('value');
    const bankSnapshot = await bankRef.once('value');
    const userData = userSnapshot.val() || {};
    const bankData = bankSnapshot.val() || {};

    const maxBorrow = Math.floor((userData.supply || 0) * 0.8);
    if ((userData.loan || 0) + amount > maxBorrow || (bankData.totalSupply || 0) < amount) {
      return res.json({ message: 'Borrow limit exceeded or bank lacks supply.' });
    }

    const newLoan = (userData.loan || 0) + amount;
    const newBalance = (userData.balance || 0) + amount;
    const newTotalLoan = (bankData.totalLoan || 0) + amount;
    const newTotalSupply = (bankData.totalSupply || 0) - amount;

    await userRef.update({ balance: newBalance, loan: newLoan });
    await bankRef.update({ totalLoan: newTotalLoan, totalSupply: newTotalSupply });

    res.json({ message: `Borrowed ${amount} coins.` });
  } catch (error) {
    res.status(500).json({ message: 'Borrow error.' });
  }
});

// Repay API
app.post('/api/repay', async (req, res) => {
  const { userId } = req.body;
  const usersRef = db.ref('users');
  const bankRef = db.ref('bank');
  const prizeRef = db.ref('prize');

  try {
    const usersSnapshot = await usersRef.once('value');
    const bankSnapshot = await bankRef.once('value');
    const prizeSnapshot = await prizeRef.once('value');

    const user = usersSnapshot.val()[userId] || { loan: 0, balance: 0 };
    if (user.loan <= 0) return res.json({ message: 'No loan to repay.' });

    const interest = user.loan * 0.1;
    const totalRepayment = user.loan + interest;

    if (user.balance < totalRepayment) {
      return res.json({ message: 'Insufficient balance to repay.' });
    }

    const newBalance = user.balance - totalRepayment;
    const newPrizeTotal = (prizeSnapshot.val().total || 0) + interest;
    const newBankTotalSupply = (bankSnapshot.val().totalSupply || 0) + user.loan;

    const updates = {};
    updates[`users/${userId}/balance`] = newBalance;
    updates[`users/${userId}/loan`] = 0;
    updates[`prize/total`] = newPrizeTotal;
    updates[`bank/totalSupply`] = newBankTotalSupply;

    await db.ref().update(updates);
    res.json({ message: 'Loan repaid successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Repay error.' });
  }
});

// Get user balance API
app.get('/api/getBalance', async (req, res) => {
  const { userId } = req.query;
  const userRef = db.ref(`users/${userId}`);

  try {
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};

    if (userData.balance !== undefined) {
      res.json({ balance: userData.balance });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance.' });
  }
});

app.listen(8080, () => {
  console.log('REST API running on port 8080');
});

bot.launch();
console.log('Bot running. Use the front-end to interact.');
