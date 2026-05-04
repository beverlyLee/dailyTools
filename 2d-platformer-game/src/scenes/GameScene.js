import Phaser from 'phaser';
import Player from '../objects/Player';
import TilemapManager from '../utils/TilemapManager';
import SaveManager from '../utils/SaveManager';

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    
    this.player = null;
    this.platforms = null;
    this.coins = null;
    this.spikes = null;
    this.tilemapManager = null;
    this.saveManager = null;
    this.isPaused = false;
    this.isGameOver = false;
    this.gameOverUI = null;
    this.deathNotification = null;
    
    this.gameState = {
      level: 1,
      coins: 0,
      lives: 3,
      playerPosition: { x: 100, y: 500 }
    };
  }
  
  init(data) {
    this.newGame = data.newGame !== false;
  }
  
  preload() {
    this.tilemapManager = new TilemapManager(this);
    this.saveManager = new SaveManager();
  }
  
  create() {
    // 加载游戏状态
    if (!this.newGame && this.saveManager.hasSaveData()) {
      const savedData = this.saveManager.loadGame();
      if (savedData) {
        this.gameState = { ...this.gameState, ...savedData.gameState };
      }
    }
    
    // 创建背景
    this.add.image(400, 300, 'background').setScale(0.5);
    
    // 创建关卡数据
    const levelData = this.tilemapManager.generateLevelData();
    
    // 创建静态平台组
    this.platforms = this.physics.add.staticGroup();
    
    // 创建地面
    this.createGround();
    
    // 创建平台
    this.createPlatforms();
    
    // 创建金币
    this.coins = this.physics.add.group();
    this.createCoins(levelData.objects.coins);
    
    // 创建尖刺
    this.spikes = this.physics.add.group();
    this.createSpikes(levelData.objects.spikes);
    
    // 创建玩家
    const playerStart = this.newGame ? 
      levelData.objects.playerStart : 
      this.gameState.playerPosition;
    
    this.player = new Player(this, playerStart.x, playerStart.y);
    this.player.setScale(0.5);
    
    // 碰撞检测
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(
      this.player, 
      this.coins, 
      this.collectCoin, 
      null, 
      this
    );
    this.physics.add.overlap(
      this.player, 
      this.spikes, 
      this.hitSpike, 
      null, 
      this
    );
    
    // 相机跟随
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, 1600, 600);
    this.physics.world.setBounds(0, 0, 1600, 600);
    
    // 键盘输入
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // 保存游戏快捷键 (S)
    this.input.keyboard.on('keydown-S', () => {
      if (!this.isPaused && !this.isGameOver) {
        this.saveGame();
      }
    });
    
    // 暂停游戏 (ESC)
    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.isGameOver) {
        this.togglePause();
      }
    });
    
    // 事件监听
    this.player.on('collectCoin', (coin) => {
      this.gameState.coins++;
      this.updateUI();
    });
    
    this.player.on('die', () => {
      this.gameState.lives--;
      this.updateUI();
      
      // 显示死亡提示
      this.showDeathNotification();
      
      if (this.gameState.lives <= 0) {
        this.gameOver();
      }
    });
    
    // 更新UI
    this.updateUI();
  }
  
  update() {
    if (this.isPaused || this.isGameOver) {
      return;
    }
    
    if (this.player) {
      this.player.update();
      
      // 更新游戏状态中的玩家位置
      this.gameState.playerPosition = {
        x: this.player.x,
        y: this.player.y
      };
      
      // 检查是否掉出屏幕
      if (this.player.y > 650) {
        this.player.die();
        this.respawnPlayer();
      }
    }
  }
  
  createGround() {
    // 创建地面
    for (let x = 0; x < 50; x++) {
      const groundTile = this.platforms.create(x * 32, 568, 'ground');
      groundTile.setScale(2).refreshBody();
    }
  }
  
  createPlatforms() {
    // 创建平台
    const platformPositions = [
      { x: 320, y: 440, width: 5 },
      { x: 640, y: 344, width: 5 },
      { x: 960, y: 248, width: 5 },
      { x: 1280, y: 440, width: 5 }
    ];
    
    platformPositions.forEach(pos => {
      for (let i = 0; i < pos.width; i++) {
        const platformTile = this.platforms.create(
          pos.x + i * 32, 
          pos.y, 
          'ground'
        );
        platformTile.setScale(2).refreshBody();
      }
    });
  }
  
  createCoins(coinPositions) {
    coinPositions.forEach(pos => {
      const coin = this.coins.create(pos.x, pos.y, 'coin');
      coin.setScale(0.5);
      coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });
  }
  
  createSpikes(spikePositions) {
    spikePositions.forEach(pos => {
      const spike = this.spikes.create(pos.x, pos.y, 'spike');
      spike.setScale(0.5);
      spike.body.allowGravity = false;
      spike.body.immovable = true;
    });
  }
  
  collectCoin(player, coin) {
    player.collectCoin(coin);
  }
  
  hitSpike(player, spike) {
    player.die();
    this.respawnPlayer();
  }
  
  respawnPlayer() {
    // 简单的重生机制
    this.time.delayedCall(1500, () => {
      if (this.gameState.lives > 0 && !this.isGameOver) {
        this.player.setPosition(100, 500);
        this.player.setVelocity(0, 0);
        this.player.setActive(true);
        this.player.setVisible(true);
      }
    });
  }
  
  showDeathNotification() {
    // 清除之前的死亡提示
    if (this.deathNotification) {
      this.deathNotification.destroy();
    }
    
    // 创建死亡提示
    this.deathNotification = this.add.container(
      this.cameras.main.midPoint.x,
      this.cameras.main.midPoint.y
    );
    
    const background = this.add.rectangle(0, 0, 300, 120, 0x000000, 0.8);
    const title = this.add.text(0, -30, '你死亡了！', {
      fontSize: '28px',
      fill: '#ff0000',
      fontFamily: 'Arial',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    const livesText = this.add.text(0, 10, `剩余生命: ${this.gameState.lives}`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    this.deathNotification.add([background, title, livesText]);
    
    // 2秒后自动移除
    this.time.delayedCall(2000, () => {
      if (this.deathNotification) {
        this.deathNotification.destroy();
        this.deathNotification = null;
      }
    });
  }
  
  playerDie() {
    // 玩家死亡处理
    this.player.setActive(false);
    this.player.setVisible(false);
  }
  
  saveGame() {
    if (this.saveManager.saveGame(this.gameState)) {
      console.log('Game saved successfully!');
      this.showSaveNotification('游戏已保存！');
    } else {
      console.log('Failed to save game.');
      this.showSaveNotification('保存失败！');
    }
  }
  
  showSaveNotification(message) {
    // 可以在这里显示保存通知
    const notification = this.add.text(
      this.cameras.main.midPoint.x, 
      this.cameras.main.midPoint.y - 100, 
      message, 
      {
        fontSize: '24px',
        fill: '#ffffff',
        backgroundColor: '#000000'
      }
    ).setOrigin(0.5);
    
    this.time.delayedCall(2000, () => {
      notification.destroy();
    });
  }
  
  updateUI() {
    // 发送事件到UIScene更新UI
    this.events.emit('updateUI', {
      coins: this.gameState.coins,
      lives: this.gameState.lives,
      level: this.gameState.level
    });
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.world.pause();
      this.showPauseMenu();
    } else {
      this.physics.world.resume();
      this.hidePauseMenu();
    }
  }
  
  showPauseMenu() {
    // 这里可以实现暂停菜单
    this.showSaveNotification('游戏已暂停 - 按ESC继续');
  }
  
  hidePauseMenu() {
    // 隐藏暂停菜单
  }
  
  gameOver() {
    this.isGameOver = true;
    this.physics.world.pause();
    
    // 相机震动效果
    this.cameras.main.shake(500);
    
    // 延迟显示游戏结束UI
    this.time.delayedCall(800, () => {
      this.showGameOverUI();
    });
  }
  
  showGameOverUI() {
    // 创建游戏结束UI容器
    this.gameOverUI = this.add.container(
      this.cameras.main.midPoint.x,
      this.cameras.main.midPoint.y
    );
    
    // 背景
    const background = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.9);
    
    // 标题
    const title = this.add.text(0, -140, '游戏结束', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Arial',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // 得分信息
    const scoreTitle = this.add.text(0, -60, '最终得分', {
      fontSize: '24px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    const coinsText = this.add.text(0, -20, `收集金币: ${this.gameState.coins} 个`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    const levelText = this.add.text(0, 20, `到达关卡: 第 ${this.gameState.level} 关`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // 提示信息
    const hintText = this.add.text(0, 80, '游戏已暂停，请选择下一步操作', {
      fontSize: '16px',
      fill: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // 按钮
    const restartButton = this.add.text(0, 130, '重新开始', {
      fontSize: '24px',
      fill: '#00ff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    const menuButton = this.add.text(0, 170, '返回主菜单', {
      fontSize: '24px',
      fill: '#00ffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    // 添加到容器
    this.gameOverUI.add([
      background, 
      title, 
      scoreTitle, 
      coinsText, 
      levelText, 
      hintText,
      restartButton, 
      menuButton
    ]);
    
    // 按钮事件
    restartButton.on('pointerdown', () => {
      this.restartGame();
    });
    
    menuButton.on('pointerdown', () => {
      this.returnToMenu();
    });
    
    // 悬停效果
    restartButton.on('pointerover', () => {
      restartButton.setFill('#ffff00');
    });
    
    restartButton.on('pointerout', () => {
      restartButton.setFill('#00ff00');
    });
    
    menuButton.on('pointerover', () => {
      menuButton.setFill('#ffff00');
    });
    
    menuButton.on('pointerout', () => {
      menuButton.setFill('#00ffff');
    });
  }
  
  restartGame() {
    // 重置游戏状态
    this.gameState = {
      level: 1,
      coins: 0,
      lives: 3,
      playerPosition: { x: 100, y: 500 }
    };
    
    this.isGameOver = false;
    this.physics.world.resume();
    
    // 重启场景
    this.scene.start('GameScene', { newGame: true });
  }
  
  returnToMenu() {
    this.isGameOver = false;
    this.physics.world.resume();
    
    // 返回主菜单
    this.scene.start('MenuScene');
    this.scene.stop('UIScene');
  }
}

export default GameScene;
