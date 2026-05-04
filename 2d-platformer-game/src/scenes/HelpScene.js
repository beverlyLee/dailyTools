import Phaser from 'phaser';

class HelpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HelpScene' });
  }

  create() {
    // 背景
    this.add.image(400, 300, 'background').setScale(0.5);
    
    // 标题
    this.add.text(400, 60, '游戏说明', {
      fontSize: '36px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // 游戏玩法说明
    this.add.text(400, 120, '【游戏玩法】', {
      fontSize: '24px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    const controlsText = [
      '← → 方向键：左右移动',
      '↑ 方向键 / 空格键：跳跃',
      '双击跳跃键：二段跳（空中）',
      'S 键：保存游戏进度'
    ];
    
    controlsText.forEach((text, index) => {
      this.add.text(400, 160 + index * 40, text, {
        fontSize: '18px',
        fill: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
    });
    
    // 得分规则
    this.add.text(400, 340, '【得分规则】', {
      fontSize: '24px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    const scoringText = [
      '收集金币：每个金币 +1 分',
      '完成关卡：通关后获得额外奖励',
      '避免危险：不要触碰尖刺或掉落'
    ];
    
    scoringText.forEach((text, index) => {
      this.add.text(400, 380 + index * 40, text, {
        fontSize: '18px',
        fill: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
    });
    
    // 生命值说明
    this.add.text(400, 500, '【生命值】', {
      fontSize: '24px',
      fill: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    this.add.text(400, 540, '游戏开始时有 3 条生命，触碰尖刺或掉落会失去生命', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // 返回按钮
    const backButton = this.add.text(400, 580, '返回主菜单', {
      fontSize: '24px',
      fill: '#00ff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive();
    
    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
    
    backButton.on('pointerover', () => {
      backButton.setFill('#ffff00');
    });
    
    backButton.on('pointerout', () => {
      backButton.setFill('#00ff00');
    });
  }
}

export default HelpScene;
