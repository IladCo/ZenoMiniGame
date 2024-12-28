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
let lastTapTime = 0;

function preload() {
this.load.image('coin', './coin.png');  // Update the path if needed
}

function create() {
scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });

this.time.addEvent({
  delay: 500,
  callback: dropCoin,
  callbackScope: this,
  loop: true
});
}

function dropCoin() {
const x = Phaser.Math.Between(100, 700);
const coin = this.physics.add.sprite(x, 0, 'coin');
coin.setVelocityY(200);

coin.setInteractive();
coin.on('pointerdown', function () {
  const cooldown = 60 * 1000;  // 1 minute for testing, change to 12 hours later
  if (Date.now() - lastTapTime > cooldown) {
    score += 10;
    scoreText.setText('Score: ' + score);
    lastTapTime = Date.now();
  }
  coin.destroy();
});
}

function update() {
// Any additional game updates
}
