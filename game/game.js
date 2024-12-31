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

const game = new Phaser.Game(config);

let score = 0;
let scoreText;
let tappingEnabled = true;
let sessionStartTime;
const tapDuration = 10 * 1000;  // 1 minute
const cooldownTime = 12 * 60 * 60 * 1000;  // 12 hours

function preload() {
  this.load.image('coin', './coin.png');  // Update path if needed
}

function create() {
  scoreText = this.add.text(16, 16, `Score: ${score}`, { fontSize: '32px', fill: '#fff' });

  this.time.addEvent({
    delay: 500,
    callback: dropCoin,
    callbackScope: this,
    loop: true
  });

  startTapSession();
}

function startTapSession() {
  tappingEnabled = true;
  sessionStartTime = Date.now();
  
  setTimeout(() => {
    tappingEnabled = false;
    showEndSessionUI();
    setTimeout(startTapSession, cooldownTime);
  }, tapDuration);
}

function dropCoin() {
  const x = Phaser.Math.Between(100, 700);
  const coin = this.physics.add.sprite(x, 0, 'coin');
  coin.setVelocityY(200);
  coin.setScale(0.3);
  coin.setInteractive();

  coin.on('pointerdown', function () {
    if (tappingEnabled) {
      score += 10;
      scoreText.setText('Score: ' + score);
      coin.destroy();
    }
  });
}

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
    debugger
    updateBackendWithScore(score);
    window.open('/supply', '_self');
    container.remove();
  };

  container.appendChild(message);
  container.appendChild(exitButton);
  container.appendChild(supplyButton);
  document.body.appendChild(container);
}

function updateBackendWithScore(finalScore) {
  const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  fetch('/update-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, score: finalScore })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Score updated:', data);
  })
  .catch((error) => {
    console.error('Error updating score:', error);
  });
}

function update() {
  // Game loop logic (if needed)
}
