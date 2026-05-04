import Phaser from 'phaser';
import { GameConfig } from '../config.js';

/**
 * 游戏结束场景
 * 显示最终得分和重新开始选项
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  /**
   * 初始化场景数据
   * @param {Object} data - 从上一个场景传递的数据
   */
  init(data) {
    this.finalScore = data.score || 0;
    this.isVictory = data.isVictory || false;
    this.level = data.level || 1;
  }

  create() {
    // 创建背景
    this.createBackground();
    
    // 创建标题
    this.createTitle();
    
    // 创建得分显示
    this.createScoreDisplay();
    
    // 创建菜单按钮
    this.createMenuButtons();
    
    // 保存高分
    this.saveHighScore();
    
    // 添加键盘事件
    this.setupInput();
  }

  /**
   * 创建背景
   */
  createBackground() {
    // 根据胜利或失败设置不同的背景
    if (this.isVictory) {
      this.cameras.main.setBackgroundColor(0x003300); // 绿色背景表示胜利
    } else {
      this.cameras.main.setBackgroundColor(0x330000); // 红色背景表示失败
    }
    
    // 添加半透明覆盖层
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
  }

  /**
   * 创建标题
   */
  createTitle() {
    const centerX = GameConfig.WIDTH / 2;
    const centerY = GameConfig.HEIGHT / 2;
    
    let titleText, titleColor;
    
    if (this.isVictory) {
      titleText = '胜利！';
      titleColor = '#00ff00';
    } else {
      titleText = '游戏结束';
      titleColor = '#ff0000';
    }
    
    // 主标题
    this.titleText = this.add.text(
      centerX,
      centerY - 150,
      titleText,
      {
        font: 'bold 64px Arial',
        fill: titleColor,
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.titleText.setOrigin(0.5);
    
    // 关卡信息
    this.levelText = this.add.text(
      centerX,
      centerY - 90,
      `第 ${this.level} 关`,
      {
        font: 'bold 24px Arial',
        fill: '#ffffff'
      }
    );
    this.levelText.setOrigin(0.5);
    
    // 添加标题动画
    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.5, to: 1.0 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * 创建得分显示
   */
  createScoreDisplay() {
    const centerX = GameConfig.WIDTH / 2;
    const centerY = GameConfig.HEIGHT / 2;
    
    // 最终得分
    this.scoreLabel = this.add.text(
      centerX,
      centerY - 30,
      '最终得分',
      {
        font: 'bold 24px Arial',
        fill: '#cccccc'
      }
    );
    this.scoreLabel.setOrigin(0.5);
    
    this.scoreValue = this.add.text(
      centerX,
      centerY + 20,
      this.finalScore.toString(),
      {
        font: 'bold 56px Arial',
        fill: '#ffff00'
      }
    );
    this.scoreValue.setOrigin(0.5);
    
    // 得分动画
    this.tweens.add({
      targets: this.scoreValue,
      scale: { from: 0.5, to: 1.0 },
      duration: 1000,
      ease: 'Back.easeOut'
    });
    
    // 检查是否是新纪录
    const highScore = this.getHighScore();
    if (this.finalScore > highScore) {
      this.newRecordText = this.add.text(
        centerX,
        centerY + 70,
        '新纪录！',
        {
          font: 'bold 20px Arial',
          fill: '#ff00ff'
        }
      );
      this.newRecordText.setOrigin(0.5);
      
      // 闪烁动画
      this.tweens.add({
        targets: this.newRecordText,
        alpha: { from: 0.3, to: 1.0 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      // 显示最高分
      this.highScoreText = this.add.text(
        centerX,
        centerY + 70,
        `最高分: ${highScore}`,
        {
          font: '18px Arial',
          fill: '#aaaaaa'
        }
      );
      this.highScoreText.setOrigin(0.5);
    }
  }

  /**
   * 创建菜单按钮
   */
  createMenuButtons() {
    const centerX = GameConfig.WIDTH / 2;
    const startY = GameConfig.HEIGHT / 2 + 120;
    const buttonSpacing = 60;
    
    // 重新开始按钮
    this.restartButton = this.createButton(
      centerX,
      startY,
      '重新开始',
      () => this.restartGame()
    );
    
    // 返回主菜单按钮
    this.menuButton = this.createButton(
      centerX,
      startY + buttonSpacing,
      '返回主菜单',
      () => this.goToMenu()
    );
    
    // 下一关按钮（如果是胜利）
    if (this.isVictory) {
      this.nextLevelButton = this.createButton(
        centerX,
        startY - buttonSpacing,
        '下一关',
        () => this.nextLevel()
      );
    }
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
        font: 'bold 24px Arial',
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
   * 设置输入
   */
  setupInput() {
    // 空格键快速重新开始
    this.input.keyboard.on('keydown-SPACE', () => {
      this.restartGame();
    });
    
    // R键重新开始
    this.input.keyboard.on('keydown-R', () => {
      this.restartGame();
    });
    
    // ESC键返回主菜单
    this.input.keyboard.on('keydown-ESC', () => {
      this.goToMenu();
    });
  }

  /**
   * 重新开始游戏
   */
  restartGame() {
    // 切换到游戏场景
    this.scene.start('GameScene', { level: this.level });
  }

  /**
   * 下一关
   */
  nextLevel() {
    // 切换到游戏场景，关卡+1
    this.scene.start('GameScene', { level: this.level + 1 });
  }

  /**
   * 返回主菜单
   */
  goToMenu() {
    this.scene.start('MainMenuScene');
  }

  /**
   * 保存高分
   */
  saveHighScore() {
    try {
      const currentHighScore = this.getHighScore();
      if (this.finalScore > currentHighScore) {
        localStorage.setItem('spaceShooterHighScore', this.finalScore.toString());
      }
    } catch (e) {
      console.warn('无法保存高分:', e);
    }
  }

  /**
   * 获取最高分
   * @returns {number} 最高分
   */
  getHighScore() {
    try {
      return parseInt(localStorage.getItem('spaceShooterHighScore')) || 0;
    } catch (e) {
      return 0;
    }
  }
}
