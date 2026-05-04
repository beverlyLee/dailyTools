import Phaser from 'phaser';
import { GameConfig, EnemyBehavior } from '../config.js';
import { BulletPool, EnemyPool } from '../systems/ObjectPool.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { Player } from '../objects/Player.js';
import { Bullet } from '../objects/Bullet.js';
import { Enemy } from '../objects/Enemy.js';

/**
 * 游戏场景
 * 这是游戏的核心场景，包含所有游戏逻辑
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * 初始化场景数据
   * @param {Object} data - 从上一个场景传递的数据
   */
  init(data) {
    this.level = data.level || 1;
    this.score = 0;
    this.lives = GameConfig.PLAYER.HEALTH;
    this.isPaused = false;
    this.isGameOver = false;
  }

  create() {
    // 创建背景
    this.createBackground();
    
    // 创建UI
    this.createUI();
    
    // 初始化对象池
    this.initObjectPools();
    
    // 创建玩家
    this.createPlayer();
    
    // 初始化波次系统
    this.initWaveSystem();
    
    // 设置输入
    this.setupInput();
    
    // 设置碰撞检测
    this.setupCollisions();
    
    // 开始游戏
    this.startGame();
  }

  update(time, delta) {
    if (this.isPaused || this.isGameOver) {
      return;
    }
    
    // 更新玩家
    this.updatePlayer(time, delta);
    
    // 更新波次系统
    this.updateWaveSystem(time, delta);
    
    // 更新敌人
    this.updateEnemies(time, delta);
    
    // 更新子弹
    this.updateBullets();
    
    // 更新背景
    this.updateBackground();
  }

  /**
   * 创建背景
   */
  createBackground() {
    // 深色背景
    this.cameras.main.setBackgroundColor(0x000011);
    
    // 创建星星背景
    this.stars = [];
    const starCount = 150;
    
    for (let i = 0; i < starCount; i++) {
      const star = this.add.image(
        Phaser.Math.Between(0, GameConfig.WIDTH),
        Phaser.Math.Between(0, GameConfig.HEIGHT),
        'star'
      );
      
      // 设置不同的速度和透明度
      star.setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
      star.setScale(Phaser.Math.FloatBetween(0.3, 1.2));
      
      // 存储星星数据
      this.stars.push({
        sprite: star,
        speed: Phaser.Math.FloatBetween(1, 4)
      });
    }
  }

  /**
   * 更新背景
   */
  updateBackground() {
    // 移动星星
    this.stars.forEach(starData => {
      starData.sprite.y += starData.speed;
      
      // 如果星星超出屏幕底部，重新放置到顶部
      if (starData.sprite.y > GameConfig.HEIGHT) {
        starData.sprite.y = -10;
        starData.sprite.x = Phaser.Math.Between(0, GameConfig.WIDTH);
      }
    });
  }

  /**
   * 创建UI
   */
  createUI() {
    const padding = 20;
    
    // 分数文本
    this.scoreText = this.add.text(
      padding,
      padding,
      '分数: 0',
      {
        font: 'bold 20px Arial',
        fill: '#ffffff'
      }
    );
    
    // 生命值文本
    this.livesText = this.add.text(
      padding,
      padding + 30,
      '生命: ' + this.lives,
      {
        font: 'bold 20px Arial',
        fill: '#ff0000'
      }
    );
    
    // 关卡文本
    this.levelText = this.add.text(
      GameConfig.WIDTH - padding,
      padding,
      '第 ' + this.level + ' 关',
      {
        font: 'bold 20px Arial',
        fill: '#00ffff'
      }
    );
    this.levelText.setOrigin(1, 0);
    
    // 波次提示文本（初始隐藏）
    this.waveText = this.add.text(
      GameConfig.WIDTH / 2,
      GameConfig.HEIGHT / 2 - 100,
      '',
      {
        font: 'bold 36px Arial',
        fill: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.waveText.setOrigin(0.5);
    this.waveText.setVisible(false);
  }

  /**
   * 初始化对象池
   */
  initObjectPools() {
    // 玩家子弹对象池
    this.playerBulletPool = new BulletPool(
      this,
      (scene) => new Bullet(scene, 'bullet', true),
      GameConfig.BULLET.POOL_SIZE
    );
    
    // 敌人子弹对象池
    this.enemyBulletPool = new BulletPool(
      this,
      (scene) => new Bullet(scene, 'enemyBullet', false),
      GameConfig.BULLET.POOL_SIZE
    );
    
    // 敌人对象池
    this.enemyPool = new EnemyPool(
      this,
      (scene) => {
        const enemy = new Enemy(scene);
        enemy.pool = this.enemyPool;
        return enemy;
      },
      GameConfig.ENEMY.POOL_SIZE
    );
  }

  /**
   * 创建玩家
   */
  createPlayer() {
    this.player = new Player(this);
    
    // 设置玩家位置（屏幕底部中央）
    this.player.setPosition(
      GameConfig.WIDTH / 2,
      GameConfig.HEIGHT - 80
    );
  }

  /**
   * 初始化波次系统
   */
  initWaveSystem() {
    this.waveSystem = new WaveSystem(this, this.spawnEnemy.bind(this));
    
    // 设置回调函数
    this.waveSystem.onWaveStart = (waveData, waveIndex) => {
      this.showWaveText('波次 ' + waveData.waveNumber + ': ' + waveData.name);
    };
    
    this.waveSystem.onWaveComplete = (waveData, waveIndex) => {
      console.log('完成波次:', waveData.name);
      // 可以在这里添加奖励
    };
    
    this.waveSystem.onLevelComplete = (level) => {
      this.victory();
    };
  }

  /**
   * 生成敌人
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} type - 敌人类型
   * @param {string} behavior - 行为模式
   * @param {boolean} canAttack - 是否可以攻击
   * @param {number} formationX - 编队X位置
   * @returns {Enemy} 敌人数组
   */
  spawnEnemy(x, y, type, behavior, canAttack, formationX = null) {
    // 从对象池获取敌人
    const enemy = this.enemyPool.get(x, y, {
      type: type,
      behavior: behavior,
      canAttack: canAttack,
      formationX: formationX
    });
    
    return enemy;
  }

  /**
   * 设置输入
   */
  setupInput() {
    // 键盘输入
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // WASD键
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    
    // 空格键射击
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // ESC键暂停
    this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    // P键暂停
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  }

  /**
   * 设置碰撞检测
   */
  setupCollisions() {
    // 玩家子弹与敌人碰撞
    this.physics.add.overlap(
      this.playerBulletPool.getActive.bind(this.playerBulletPool),
      this.enemyPool.getActive.bind(this.enemyPool),
      this.handleBulletEnemyCollision,
      null,
      this
    );
    
    // 敌人与玩家碰撞
    this.physics.add.overlap(
      this.enemyPool.getActive.bind(this.enemyPool),
      this.player,
      this.handleEnemyPlayerCollision,
      null,
      this
    );
    
    // 敌人子弹与玩家碰撞
    this.physics.add.overlap(
      this.enemyBulletPool.getActive.bind(this.enemyBulletPool),
      this.player,
      this.handleEnemyBulletPlayerCollision,
      null,
      this
    );
  }

  /**
   * 开始游戏
   */
  startGame() {
    // 显示开始提示
    this.showWaveText('第 ' + this.level + ' 关 开始！');
    
    // 延迟后开始波次系统
    this.time.delayedCall(2000, () => {
      this.waveSystem.start(this.level);
    });
  }

  /**
   * 更新玩家
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  updatePlayer(time, delta) {
    if (!this.player || !this.player.active) {
      return;
    }
    
    // 移动输入
    let moveX = 0;
    let moveY = 0;
    
    // 水平移动
    if (this.cursors.left.isDown || this.keyA.isDown) {
      moveX = -1;
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      moveX = 1;
    }
    
    // 垂直移动
    if (this.cursors.up.isDown || this.keyW.isDown) {
      moveY = -1;
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      moveY = 1;
    }
    
    // 移动玩家
    this.player.move(moveX, moveY);
    
    // 射击
    if (this.keySpace.isDown) {
      this.playerShoot();
    }
    
    // 暂停
    if (Phaser.Input.Keyboard.JustDown(this.keyESC) || 
        Phaser.Input.Keyboard.JustDown(this.keyP)) {
      this.togglePause();
    }
  }

  /**
   * 玩家射击
   */
  playerShoot() {
    if (!this.player || !this.player.active) {
      return;
    }
    
    const bullet = this.player.shoot(this.playerBulletPool);
    
    if (bullet) {
      // 可以在这里添加射击音效
    }
  }

  /**
   * 更新波次系统
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  updateWaveSystem(time, delta) {
    if (this.waveSystem) {
      this.waveSystem.update(time, delta);
    }
  }

  /**
   * 更新敌人
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  updateEnemies(time, delta) {
    // 更新敌人状态机
    this.enemyPool.update(time, delta);
    
    // 检查敌人是否超出屏幕
    this.enemyPool.checkBounds();
  }

  /**
   * 更新子弹
   */
  updateBullets() {
    // 检查玩家子弹是否超出屏幕
    this.playerBulletPool.checkBounds();
    
    // 检查敌人子弹是否超出屏幕
    this.enemyBulletPool.checkBounds();
  }

  /**
   * 处理玩家子弹与敌人碰撞
   * @param {Bullet} bullet - 子弹
   * @param {Enemy} enemy - 敌人
   */
  handleBulletEnemyCollision(bullet, enemy) {
    // 子弹伤害敌人
    if (enemy.takeDamage) {
      enemy.takeDamage(bullet.damage);
    }
    
    // 释放子弹
    this.playerBulletPool.release(bullet);
    
    // 通知波次系统敌人被消灭
    if (enemy.health <= 0) {
      this.waveSystem.enemyDestroyed();
    }
  }

  /**
   * 处理敌人与玩家碰撞
   * @param {Enemy} enemy - 敌人
   * @param {Player} player - 玩家
   */
  handleEnemyPlayerCollision(enemy, player) {
    // 敌人受伤（被玩家撞击）
    if (enemy.takeDamage) {
      enemy.takeDamage(1);
    }
    
    // 玩家受伤
    this.playerHit();
    
    // 通知波次系统
    if (enemy.health <= 0) {
      this.waveSystem.enemyDestroyed();
    }
  }

  /**
   * 处理敌人子弹与玩家碰撞
   * @param {Bullet} bullet - 子弹
   * @param {Player} player - 玩家
   */
  handleEnemyBulletPlayerCollision(bullet, player) {
    // 释放子弹
    this.enemyBulletPool.release(bullet);
    
    // 玩家受伤
    this.playerHit();
  }

  /**
   * 玩家受伤
   */
  playerHit() {
    if (!this.player || this.player.isInvincible) {
      return;
    }
    
    // 玩家受伤
    if (this.player.takeDamage) {
      this.player.takeDamage(1);
    }
    
    // 减少生命值
    this.lives--;
    this.updateLivesUI();
    
    // 检查是否游戏结束
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  /**
   * 增加分数
   * @param {number} points - 分数
   */
  addScore(points) {
    this.score += points;
    this.updateScoreUI();
  }

  /**
   * 更新分数UI
   */
  updateScoreUI() {
    if (this.scoreText) {
      this.scoreText.setText('分数: ' + this.score);
    }
  }

  /**
   * 更新生命值UI
   */
  updateLivesUI() {
    if (this.livesText) {
      this.livesText.setText('生命: ' + this.lives);
    }
  }

  /**
   * 显示波次文本
   * @param {string} text - 要显示的文本
   */
  showWaveText(text) {
    if (this.waveText) {
      this.waveText.setText(text);
      this.waveText.setVisible(true);
      this.waveText.setAlpha(1);
      
      // 淡入淡出效果
      this.tweens.add({
        targets: this.waveText,
        alpha: 0,
        duration: 2000,
        delay: 1000,
        onComplete: () => {
          this.waveText.setVisible(false);
        }
      });
    }
  }

  /**
   * 切换暂停状态
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    
    // 暂停/恢复波次系统
    if (this.waveSystem) {
      if (this.isPaused) {
        this.waveSystem.pause();
      } else {
        this.waveSystem.resume();
      }
    }
    
    // 显示暂停提示
    if (this.isPaused) {
      this.showWaveText('游戏暂停');
    }
  }

  /**
   * 游戏结束
   */
  gameOver() {
    this.isGameOver = true;
    
    // 停止波次系统
    if (this.waveSystem) {
      this.waveSystem.stop();
    }
    
    // 销毁玩家
    if (this.player) {
      this.player.destroy();
    }
    
    // 延迟后切换到游戏结束场景
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        isVictory: false,
        level: this.level
      });
    });
  }

  /**
   * 胜利
   */
  victory() {
    this.isGameOver = true;
    
    // 停止波次系统
    if (this.waveSystem) {
      this.waveSystem.stop();
    }
    
    // 显示胜利文本
    this.showWaveText('关卡完成！');
    
    // 延迟后切换到游戏结束场景
    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        isVictory: true,
        level: this.level
      });
    });
  }

  /**
   * 场景销毁时调用
   */
  destroy() {
    // 销毁对象池
    if (this.playerBulletPool) {
      this.playerBulletPool.destroy();
    }
    
    if (this.enemyBulletPool) {
      this.enemyBulletPool.destroy();
    }
    
    if (this.enemyPool) {
      this.enemyPool.destroy();
    }
    
    // 销毁波次系统
    if (this.waveSystem) {
      this.waveSystem.destroy();
    }
    
    // 调用父类方法
    super.destroy();
  }
}
