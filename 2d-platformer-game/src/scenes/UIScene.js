import Phaser from 'phaser';

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
    
    this.coinsText = null;
    this.livesText = null;
    this.levelText = null;
  }
  
  create() {
    // 创建UI元素
    this.levelText = this.add.text(16, 16, 'Level: 1', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    
    this.coinsText = this.add.text(16, 50, 'Coins: 0', {
      fontSize: '24px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    });
    
    this.livesText = this.add.text(16, 84, 'Lives: 3', {
      fontSize: '24px',
      fill: '#ff0000',
      fontFamily: 'Arial'
    });
    
    // 添加保存提示
    this.saveHint = this.add.text(
      this.cameras.main.width - 16, 
      16, 
      'Press S to Save', 
      {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial'
      }
    ).setOrigin(1, 0);
    
    // 监听来自GameScene的事件
    const gameScene = this.scene.get('GameScene');
    
    if (gameScene) {
      gameScene.events.on('updateUI', this.updateUI, this);
    }
  }
  
  updateUI(data) {
    if (this.levelText) {
      this.levelText.setText(`Level: ${data.level}`);
    }
    
    if (this.coinsText) {
      this.coinsText.setText(`Coins: ${data.coins}`);
    }
    
    if (this.livesText) {
      this.livesText.setText(`Lives: ${data.lives}`);
    }
  }
}

export default UIScene;
