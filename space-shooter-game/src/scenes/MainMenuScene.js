import Phaser from 'phaser';
import { GameConfig, Colors } from '../config.js';

/**
 * 主菜单场景
 * 提供游戏开始、设置和退出选项
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    // 创建背景
    this.createBackground();
    
    // 创建标题
    this.createTitle();
    
    // 创建菜单按钮
    this.createMenuButtons();
    
    // 创建版权信息
    this.createCopyright();
    
    // 添加键盘事件
    this.setupInput();
  }

  update() {
    // 更新背景动画
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
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
      const star = this.add.image(
        Phaser.Math.Between(0, GameConfig.WIDTH),
        Phaser.Math.Between(0, GameConfig.HEIGHT),
        'star'
      );
      
      // 设置不同的速度和透明度
      star.setAlpha(Phaser.Math.FloatBetween(0.3, 1.0));
      star.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
      
      // 存储星星数据
      this.stars.push({
        sprite: star,
        speed: Phaser.Math.FloatBetween(1, 3)
      });
    }
  }

  /**
   * 更新背景动画
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
   * 创建标题
   */
  createTitle() {
    const centerX = GameConfig.WIDTH / 2;
    const centerY = GameConfig.HEIGHT / 2;
    
    // 主标题
    this.titleText = this.add.text(
      centerX,
      centerY - 150,
      '太空射击',
      {
        font: 'bold 64px Arial',
        fill: '#00ffff',
        stroke: '#0000ff',
        strokeThickness: 4
      }
    );
    this.titleText.setOrigin(0.5);
    
    // 副标题
    this.subtitleText = this.add.text(
      centerX,
      centerY - 90,
      'SPACE SHOOTER',
      {
        font: 'bold 24px Arial',
        fill: '#ffffff'
      }
    );
    this.subtitleText.setOrigin(0.5);
    
    // 添加标题动画
    this.tweens.add({
      targets: this.titleText,
      scale: { from: 1.0, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * 创建菜单按钮
   */
  createMenuButtons() {
    const centerX = GameConfig.WIDTH / 2;
    const startY = GameConfig.HEIGHT / 2;
    const buttonSpacing = 60;
    
    // 开始游戏按钮
    this.startButton = this.createButton(
      centerX,
      startY,
      '开始游戏',
      () => this.startGame()
    );
    
    // 选择关卡按钮
    this.levelButton = this.createButton(
      centerX,
      startY + buttonSpacing,
      '选择关卡',
      () => this.showLevelSelect()
    );
    
    // 最高分按钮
    this.highScoreButton = this.createButton(
      centerX,
      startY + buttonSpacing * 2,
      '最高分: ' + this.getHighScore(),
      null
    );
    
    // 提示文本
    this.hintText = this.add.text(
      centerX,
      startY + buttonSpacing * 3 + 30,
      '使用方向键或WASD移动，空格键射击',
      {
        font: '16px Arial',
        fill: '#aaaaaa'
      }
    );
    this.hintText.setOrigin(0.5);
  }

  /**
   * 创建按钮
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} text - 按钮文本
   * @param {Function} callback - 点击回调
   * @returns {Phaser.GameObjects.Text} 按钮文本对象
   */
  createButton(x, y, text, callback) {
    const button = this.add.text(
      x,
      y,
      text,
      {
        font: 'bold 28px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    button.setOrigin(0.5);
    button.setInteractive();
    
    // 悬停效果
    button.on('pointerover', () => {
      button.setFill('#ffff00');
      button.setScale(1.1);
    });
    
    button.on('pointerout', () => {
      button.setFill('#ffffff');
      button.setScale(1.0);
    });
    
    // 点击效果
    if (callback) {
      button.on('pointerdown', () => {
        this.tweens.add({
          targets: button,
          scale: 0.95,
          duration: 100,
          yoyo: true,
          onComplete: () => callback()
        });
      });
    }
    
    return button;
  }

  /**
   * 创建版权信息
   */
  createCopyright() {
    this.copyrightText = this.add.text(
      GameConfig.WIDTH / 2,
      GameConfig.HEIGHT - 30,
      '© 2024 Space Shooter Game',
      {
        font: '12px Arial',
        fill: '#666666'
      }
    );
    this.copyrightText.setOrigin(0.5);
  }

  /**
   * 设置输入
   */
  setupInput() {
    // 空格键快速开始游戏
    this.input.keyboard.on('keydown-SPACE', () => {
      this.startGame();
    });
    
    // 回车键开始游戏
    this.input.keyboard.on('keydown-ENTER', () => {
      this.startGame();
    });
  }

  /**
   * 开始游戏
   */
  startGame() {
    // 播放音效（如果有）
    // this.sound.play('buttonClick');
    
    // 切换到游戏场景
    this.scene.start('GameScene', { level: 1 });
  }

  /**
   * 显示关卡选择
   */
  showLevelSelect() {
    // 这里可以实现关卡选择功能
    // 简单起见，直接开始游戏
    this.startGame();
  }

  /**
   * 获取最高分
   * @returns {number} 最高分
   */
  getHighScore() {
    try {
      return localStorage.getItem('spaceShooterHighScore') || 0;
    } catch (e) {
      return 0;
    }
  }
}
