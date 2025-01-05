const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  }
};

let game;
let balance = 0;
let tappingEnabled = true;
let sessionStartTime;
const tapDuration = 10 * 1000;  // 10 seconds
const cooldownTime = 12 * 60 * 60 * 1000;  // 12 hours
let gameStarted = false;

// Preload assets
function preload() {
  this.load.image('coin', './coin.png');  // Ensure coin image path is correct
}

// Create game scene (starts only if gameStarted is true)
function create() {
  if (!gameStarted) return;  // Prevent Phaser scene from running if game hasn’t started

  // Drop coins every 500ms
  this.time.addEvent({
    delay: 500,
    callback: dropCoin,
    callbackScope: this,
    loop: true
  });

  // Start tapping session
  startTapSession();
}

// Tap session timing
function startTapSession() {
  tappingEnabled = true;
  sessionStartTime = Date.now();
  
  setTimeout(() => {
    tappingEnabled = false;
    showEndSessionUI();
    setTimeout(startTapSession, cooldownTime);
  }, tapDuration);
}

// Drop coin logic
function dropCoin() {
  const x = Phaser.Math.Between(100, 700);
  const coin = this.physics.add.sprite(x, 0, 'coin');
  coin.setVelocityY(200);
  coin.setScale(0.3);
  coin.setInteractive();

  coin.on('pointerdown', function () {
    if (tappingEnabled) {
      balance += 1;
      updateBalanceDisplay();  
      coin.destroy();
    }
  });
}

// Sync HTML display with Phaser balance
function updateBalanceDisplay() {
  const balanceDisplay = document.getElementById('balanceDisplay');
  if (balanceDisplay) {
    balanceDisplay.innerText = `Balance: ${balance} coins`;
  }
}

// Show UI when session ends
function showEndSessionUI() {
  const container = document.createElement('div');
  container.id = 'end-session';
  container.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px; background: white; border: 1px solid #ccc; z-index: 1000;';

  const message = document.createElement('p');
  message.textContent = 'Time Is Up';
  
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit';
  exitButton.onclick = () => {
    game.destroy(true);
    container.remove();
  };

  const supplyButton = document.createElement('button');
  supplyButton.textContent = 'Supply';
  supplyButton.onclick = () => {
    updateBackendWithBalance(balance);
    window.open('/supply.html', '_self');
    container.remove();
  };

  container.appendChild(message);
  container.appendChild(exitButton);
  container.appendChild(supplyButton);
  document.body.appendChild(container);
}

// Send balance to the backend
function updateBackendWithBalance(finalBalance) {
  const userId = window.userId;

  if (!userId) {
    alert("User ID not found. Make sure you're running this in Telegram.");
    return;
  }

  fetch('/update-balance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, amount: finalBalance })
  });
}

// Start Game on Button Click
function startGame() {
  document.getElementById('startPanel').style.display = 'none';
  gameStarted = true;
  game = new Phaser.Game(config);
}

// Exit Game
function exitGame() {
  const panel = document.getElementById('startPanel');
  if (panel) panel.remove();
}

// Update loop (can add more logic here)
function update() {
  // Game loop logic (if needed)
}