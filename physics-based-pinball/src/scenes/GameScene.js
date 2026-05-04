import Phaser from 'phaser';
import { PHYSICS_CONFIG, GAME_STATE } from '../config.js';
import { Ball } from '../objects/Ball.js';
import { Bumper } from '../objects/Bumper.js';
import { Wall } from '../objects/Wall.js';
import { Flipper } from '../objects/Flipper.js';
import { Goal } from '../objects/Goal.js';
import { Launcher } from '../objects/Launcher.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { DefaultLevel } from '../utils/DefaultLevel.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.score = 0;
    this.ballsRemaining = 3;
    this.gameState = GAME_STATE.PLAYING;
    this.objects = {
      ball: null,
      bumpers: [],
      walls: [],
      flippers: [],
      goals: [],
      launcher: null
    };
    this.keys = {};
  }

  init(data) {
    this.levelData = data.levelData || DefaultLevel;
  }

  create() {
    this.matter.world.setBounds(
      PHYSICS_CONFIG.wall.thickness,
      PHYSICS_CONFIG.wall.thickness,
      this.scale.width - PHYSICS_CONFIG.wall.thickness * 2,
      this.scale.height - PHYSICS_CONFIG.wall.thickness * 2
    );

    this.particleSystem = new ParticleSystem(this);

    this.createWalls();
    this.loadLevel(this.levelData);
    this.createLauncher();
    this.setupControls();
    this.setupCollisions();
    this.startNewBall();

    this.updateUI();
  }

  createWalls() {
    const thickness = PHYSICS_CONFIG.wall.thickness;
    const width = this.scale.width;
    const height = this.scale.height;

    const wallConfig = {
      isStatic: true,
      restitution: PHYSICS_CONFIG.wall.restitution,
      friction: PHYSICS_CONFIG.wall.friction
    };

    this.leftWall = this.matter.add.rectangle(
      thickness / 2,
      height / 2,
      thickness,
      height,
      wallConfig
    );

    this.rightWall = this.matter.add.rectangle(
      width - thickness / 2,
      height / 2,
      thickness,
      height,
      wallConfig
    );

    this.topWall = this.matter.add.rectangle(
      width / 2,
      thickness / 2,
      width,
      thickness,
      wallConfig
    );

    const drainConfig = {
      isStatic: true,
      isSensor: true,
      label: 'drain'
    };

    this.drain = this.matter.add.rectangle(
      width / 2,
      height + 50,
      width,
      100,
      drainConfig
    );

    const gutterY = height - 100;
    this.gutterLeft = this.matter.add.rectangle(
      150,
      gutterY,
      150,
      thickness,
      wallConfig
    );
    
    this.gutterRight = this.matter.add.rectangle(
      width - 150,
      gutterY,
      150,
      thickness,
      wallConfig
    );

    this.renderWalls();
  }

  renderWalls() {
    const thickness = PHYSICS_CONFIG.wall.thickness;
    const width = this.scale.width;
    const height = this.scale.height;

    this.wallGraphics = this.add.graphics();
    
    this.wallGraphics.fillStyle(0x3a3a5c, 1);
    
    this.wallGraphics.fillRect(0, 0, thickness, height);
    this.wallGraphics.fillRect(width - thickness, 0, thickness, height);
    this.wallGraphics.fillRect(0, 0, width, thickness);
    
    this.wallGraphics.lineStyle(2, 0x5a5a8c, 1);
    this.wallGraphics.strokeRect(0, 0, thickness, height);
    this.wallGraphics.strokeRect(width - thickness, 0, thickness, height);
    this.wallGraphics.strokeRect(0, 0, width, thickness);
    
    const gutterY = height - 100;
    this.wallGraphics.fillStyle(0x4a4a6c, 1);
    this.wallGraphics.fillRect(75, gutterY - thickness/2, 150, thickness);
    this.wallGraphics.fillRect(width - 225, gutterY - thickness/2, 150, thickness);
  }

  loadLevel(levelData) {
    this.objects.bumpers = [];
    this.objects.walls = [];
    this.objects.flippers = [];
    this.objects.goals = [];

    if (levelData.bumpers) {
      levelData.bumpers.forEach(b => {
        const bumper = new Bumper(this, b.x, b.y, b.radius || PHYSICS_CONFIG.bumper.radius, b.points);
        this.objects.bumpers.push(bumper);
      });
    }

    if (levelData.walls) {
      levelData.walls.forEach(w => {
        const wall = new Wall(this, w.x, w.y, w.width, w.height, w.angle);
        this.objects.walls.push(wall);
      });
    }

    if (levelData.goals) {
      levelData.goals.forEach(g => {
        const goal = new Goal(this, g.x, g.y, g.radius || PHYSICS_CONFIG.goal.radius, g.points);
        this.objects.goals.push(goal);
      });
    }

    if (levelData.flippers) {
      levelData.flippers.forEach(f => {
        const flipper = new Flipper(
          this, 
          f.x, 
          f.y, 
          f.side, 
          f.length || PHYSICS_CONFIG.flipper.length
        );
        this.objects.flippers.push(flipper);
      });
    }
  }

  createLauncher() {
    const launcherX = this.scale.width - 60;
    const launcherY = this.scale.height - 200;
    
    this.objects.launcher = new Launcher(this, launcherX, launcherY);
  }

  setupControls() {
    this.keys.leftFlipper = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys.leftFlipperAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keys.rightFlipper = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keys.rightFlipperAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keys.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keys.charge = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  setupCollisions() {
    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label === 'ball' || bodyB.label === 'ball') {
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'ball' ? bodyB : bodyA;

          this.handleBallCollision(ballBody, otherBody, pair);
        }
      });
    });
  }

  handleBallCollision(ballBody, otherBody, pair) {
    const velocity = Math.sqrt(ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2);
    
    if (velocity > 2 && pair.activeContacts && pair.activeContacts.length > 0) {
      const contact = pair.activeContacts[0];
      if (contact && contact.vertex) {
        this.particleSystem.createSpark(
          contact.vertex.x,
          contact.vertex.y
        );
      }
    }

    if (otherBody.label === 'bumper') {
      const bumper = this.objects.bumpers.find(b => b.body.id === otherBody.id);
      if (bumper) {
        this.addScore(bumper.points);
        bumper.activate();
      }
    }

    if (otherBody.label === 'goal') {
      const goal = this.objects.goals.find(g => g.body.id === otherBody.id);
      if (goal) {
        this.addScore(goal.points);
        goal.activate();
      }
    }

    if (otherBody.label === 'drain') {
      this.ballDrained();
    }
  }

  startNewBall() {
    if (this.ballsRemaining <= 0) {
      this.gameOver();
      return;
    }

    if (this.objects.ball) {
      this.objects.ball.destroy();
    }

    const launcherBaseTop = this.scale.height - 65;
    const ballRadius = PHYSICS_CONFIG.ball.radius;
    
    const startX = this.scale.width - 60;
    const startY = launcherBaseTop - ballRadius;

    this.objects.ball = new Ball(this, startX, startY);
    
    this.showLaunchHint();
    this.objects.launcher.charge();
  }

  showLaunchHint() {
    if (this.hintText) {
      this.hintText.destroy();
    }
    
    this.hintText = this.add.text(
      this.scale.width / 2,
      60,
      '👉 按 [C] 键蓄力 → 松开发射！',
      {
        fontSize: '26px',
        fill: '#ffcc00',
        fontStyle: 'bold',
        backgroundColor: '#222244',
        padding: { x: 25, y: 12 }
      }
    );
    this.hintText.setOrigin(0.5);
    
    this.hintBottom = this.add.text(
      this.scale.width / 2,
      this.scale.height - 30,
      '弹板: [A][←] 左 | [D][→][空格] 右',
      {
        fontSize: '16px',
        fill: '#aaaaaa',
        align: 'center'
      }
    );
    this.hintBottom.setOrigin(0.5);
  }

  ballDrained() {
    this.ballsRemaining--;
    
    if (this.ballsRemaining <= 0) {
      this.gameOver();
    } else {
      this.updateUI();
      this.time.delayedCall(1000, () => {
        this.startNewBall();
      });
    }
  }

  addScore(points) {
    this.score += points;
    this.updateUI();
  }

  updateUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('balls').textContent = this.ballsRemaining;
  }

  gameOver() {
    this.gameState = GAME_STATE.GAME_OVER;
    
    this.game.highScoreManager.addScore(this.score);
    
    const message = document.getElementById('game-message');
    message.textContent = `游戏结束!\n得分: ${this.score}\n点击返回主菜单`;
    message.style.display = 'block';

    this.input.once('pointerdown', () => {
      message.style.display = 'none';
      document.getElementById('main-menu').style.display = 'flex';
      this.game.scene.stop('GameScene');
      this.game.scene.start('MainMenuScene');
      window.gameApp.updateHighScoresDisplay();
    });
  }

  update() {
    if (this.gameState !== GAME_STATE.PLAYING) return;

    const leftFlipperActive = this.keys.leftFlipper.isDown || this.keys.leftFlipperAlt.isDown;
    const rightFlipperActive = this.keys.rightFlipper.isDown || this.keys.rightFlipperAlt.isDown || this.keys.space.isDown;

    this.objects.flippers.forEach(flipper => {
      if (flipper.side === 'left') {
        flipper.setActive(leftFlipperActive);
      } else {
        flipper.setActive(rightFlipperActive);
      }
    });

    if (this.objects.launcher.isCharging && this.objects.ball) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.charge)) {
        this.objects.ball.setStatic(true);
      }
      
      if (this.keys.charge.isDown) {
        this.objects.launcher.increasePower();
      }
      
      if (Phaser.Input.Keyboard.JustUp(this.keys.charge)) {
        this.objects.launcher.launch(this.objects.ball);
      }
    }

    this.particleSystem.update();
  }
}
