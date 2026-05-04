import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 不再加载外部图片，而是在create中使用图形绘制
  }

  create() {
    // 创建玩家图形
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x4a90e2); // 蓝色
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.fillStyle(0x7ed321); // 绿色裤子
    playerGraphics.fillRect(0, 20, 32, 12);
    playerGraphics.fillStyle(0xf5a623); // 肤色
    playerGraphics.fillRect(8, 4, 16, 16);
    // 生成纹理
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // 创建地面瓦片
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x8b4513); // 棕色
    groundGraphics.fillRect(0, 0, 32, 32);
    groundGraphics.fillStyle(0x228b22); // 绿色草地
    groundGraphics.fillRect(0, 0, 32, 8);
    // 添加一些纹理细节
    groundGraphics.fillStyle(0x654321); // 深棕色
    for (let i = 0; i < 5; i++) {
      groundGraphics.fillRect(
        Math.floor(Math.random() * 28) + 2,
        Math.floor(Math.random() * 20) + 10,
        2, 2
      );
    }
    groundGraphics.generateTexture('ground', 32, 32);
    groundGraphics.destroy();

    // 创建金币
    const coinGraphics = this.add.graphics();
    coinGraphics.fillStyle(0xffd700); // 金色
    coinGraphics.fillCircle(16, 16, 14);
    coinGraphics.fillStyle(0xffec8b); // 亮金色
    coinGraphics.fillCircle(14, 14, 6);
    coinGraphics.fillStyle(0xffd700);
    coinGraphics.fillRect(12, 10, 8, 12);
    coinGraphics.fillStyle(0xffec8b);
    coinGraphics.fillRect(14, 12, 4, 8);
    coinGraphics.generateTexture('coin', 32, 32);
    coinGraphics.destroy();

    // 创建尖刺
    const spikeGraphics = this.add.graphics();
    spikeGraphics.fillStyle(0x808080); // 灰色
    spikeGraphics.fillTriangle(16, 0, 32, 32, 0, 32);
    spikeGraphics.fillStyle(0x505050); // 深灰色
    spikeGraphics.fillTriangle(16, 4, 28, 32, 4, 32);
    spikeGraphics.fillStyle(0xc0c0c0); // 亮灰色
    spikeGraphics.fillTriangle(16, 0, 20, 8, 12, 8);
    spikeGraphics.generateTexture('spike', 32, 32);
    spikeGraphics.destroy();

    // 创建背景
    const backgroundGraphics = this.add.graphics();
    // 天空渐变
    backgroundGraphics.fillStyle(0x87ceeb); // 天蓝
    backgroundGraphics.fillRect(0, 0, 800, 600);
    // 云朵
    backgroundGraphics.fillStyle(0xffffff);
    this.drawCloud(backgroundGraphics, 100, 80);
    this.drawCloud(backgroundGraphics, 300, 120);
    this.drawCloud(backgroundGraphics, 500, 60);
    this.drawCloud(backgroundGraphics, 700, 100);
    // 远山
    backgroundGraphics.fillStyle(0x98d98e); // 浅绿色
    backgroundGraphics.fillTriangle(0, 600, 200, 300, 400, 600);
    backgroundGraphics.fillStyle(0x7ccd7c); // 中绿色
    backgroundGraphics.fillTriangle(300, 600, 500, 350, 700, 600);
    backgroundGraphics.fillStyle(0x98d98e); // 浅绿色
    backgroundGraphics.fillTriangle(600, 600, 800, 400, 1000, 600);
    // 近山
    backgroundGraphics.fillStyle(0x228b22); // 深绿色
    backgroundGraphics.fillRect(0, 500, 800, 100);
    
    backgroundGraphics.generateTexture('background', 800, 600);
    backgroundGraphics.destroy();

    this.scene.start('MenuScene');
  }

  drawCloud(graphics, x, y) {
    graphics.fillStyle(0xffffff);
    graphics.fillEllipse(x, y, 40, 25);
    graphics.fillEllipse(x + 30, y + 5, 30, 20);
    graphics.fillEllipse(x - 25, y + 5, 25, 15);
  }
}

export default BootScene;
