import Phaser from 'phaser';

/**
 * 预加载场景
 * 负责加载游戏所需的所有资源
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // 创建加载进度条
    this.createLoadingBar();
    
    // 加载游戏资源
    this.loadGameAssets();
    
    // 加载音频资源（可选）
    this.loadAudioAssets();
  }

  create() {
    // 资源加载完成后，切换到主菜单场景
    this.scene.start('MainMenuScene');
  }

  /**
   * 创建加载进度条
   */
  createLoadingBar() {
    const width = this.game.config.width;
    const height = this.game.config.height;
    
    // 背景
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 60);
    
    // 进度条
    const progressBar = this.add.graphics();
    
    // 加载文本
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: '加载中...',
      style: {
        font: '20px monospace',
        fill: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);
    
    const percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '18px monospace',
        fill: '#ffffff'
      }
    });
    percentText.setOrigin(0.5, 0.5);
    
    const assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '',
      style: {
        font: '18px monospace',
        fill: '#ffffff'
      }
    });
    assetText.setOrigin(0.5, 0.5);
    
    // 监听加载事件
    this.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 40);
    });
    
    this.load.on('fileprogress', (file) => {
      assetText.setText('加载: ' + file.key);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });
  }

  /**
   * 加载游戏资源
   */
  loadGameAssets() {
    // 由于没有实际的图像资源，我们将使用Phaser的图形系统创建
    // 这里我们预加载一些占位资源，实际游戏中可以替换为真实资源
    
    // 玩家飞船
    this.createPlaceholderImage('player', 64, 64, (graphics) => {
      // 绘制三角形飞船
      graphics.fillStyle(0x00ffff, 1);
      graphics.beginPath();
      graphics.moveTo(32, 0);
      graphics.lineTo(64, 64);
      graphics.lineTo(32, 48);
      graphics.lineTo(0, 64);
      graphics.closePath();
      graphics.fillPath();
    });
    
    // 敌人
    this.createPlaceholderImage('enemy', 48, 48, (graphics) => {
      // 绘制简单的敌人形状
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(12, 0, 24, 48);
      graphics.fillRect(0, 12, 12, 24);
      graphics.fillRect(36, 12, 12, 24);
    });
    
    // 玩家子弹
    this.createPlaceholderImage('bullet', 8, 24, (graphics) => {
      graphics.fillStyle(0xffff00, 1);
      graphics.fillRect(0, 0, 8, 24);
    });
    
    // 敌人子弹
    this.createPlaceholderImage('enemyBullet', 8, 16, (graphics) => {
      graphics.fillStyle(0xff00ff, 1);
      graphics.fillRect(0, 0, 8, 16);
    });
    
    // 爆炸效果
    this.createPlaceholderImage('explosion', 64, 64, (graphics) => {
      graphics.fillStyle(0xffaa00, 1);
      graphics.fillCircle(32, 32, 32);
      graphics.fillStyle(0xffffff, 0.5);
      graphics.fillCircle(32, 32, 16);
    });
    
    // 背景星星
    this.createPlaceholderImage('star', 4, 4, (graphics) => {
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(2, 2, 2);
    });
  }

  /**
   * 创建占位图像
   * @param {string} key - 图像键名
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {Function} drawCallback - 绘制回调函数
   */
  createPlaceholderImage(key, width, height, drawCallback) {
    // 创建图形对象
    const graphics = this.add.graphics();
    
    // 调用绘制回调
    drawCallback(graphics);
    
    // 生成纹理
    graphics.generateTexture(key, width, height);
    
    // 销毁图形对象
    graphics.destroy();
  }

  /**
   * 加载音频资源
   */
  loadAudioAssets() {
    // 这里可以添加音频资源加载
    // 示例：
    // this.load.audio('shoot', 'assets/audio/shoot.mp3');
    // this.load.audio('explosion', 'assets/audio/explosion.mp3');
    // this.load.audio('background', 'assets/audio/background.mp3');
  }
}
