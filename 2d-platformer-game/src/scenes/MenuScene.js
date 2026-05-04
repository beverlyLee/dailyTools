import Phaser from 'phaser';

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.add.image(400, 300, 'background').setScale(0.5);
    
    this.add.text(400, 120, '2D Platformer Game', {
      fontSize: '48px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    this.add.text(400, 180, '2D平台跳跃游戏', {
      fontSize: '24px',
      fill: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    const startButton = this.add.text(400, 280, '开始游戏', {
      fontSize: '32px',
      fill: '#00ff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    const loadButton = this.add.text(400, 340, '加载存档', {
      fontSize: '32px',
      fill: '#00ffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    const helpButton = this.add.text(400, 400, '游戏说明', {
      fontSize: '32px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    const controlsText = this.add.text(400, 480, '提示: 按S键保存游戏进度', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    startButton.on('pointerdown', () => {
      this.scene.start('GameScene', { newGame: true });
      this.scene.launch('UIScene');
    });
    
    loadButton.on('pointerdown', () => {
      this.scene.start('GameScene', { newGame: false });
      this.scene.launch('UIScene');
    });
    
    helpButton.on('pointerdown', () => {
      this.scene.start('HelpScene');
    });
    
    // 悬停效果
    startButton.on('pointerover', () => {
      startButton.setFill('#ffff00');
    });
    
    startButton.on('pointerout', () => {
      startButton.setFill('#00ff00');
    });
    
    loadButton.on('pointerover', () => {
      loadButton.setFill('#ffff00');
    });
    
    loadButton.on('pointerout', () => {
      loadButton.setFill('#00ffff');
    });
    
    helpButton.on('pointerover', () => {
      helpButton.setFill('#ffffff');
    });
    
    helpButton.on('pointerout', () => {
      helpButton.setFill('#ffd700');
    });
  }
}

export default MenuScene;
