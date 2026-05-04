import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
  }

  create() {
    const graphics = this.add.graphics();
    
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    const title = this.add.text(
      this.scale.width / 2,
      200,
      '物理弹球游戏',
      {
        fontSize: '48px',
        fill: '#e94560',
        fontStyle: 'bold'
      }
    );
    title.setOrigin(0.5);

    const subtitle = this.add.text(
      this.scale.width / 2,
      270,
      '基于 Phaser 3 + Matter.js',
      {
        fontSize: '18px',
        fill: '#aaa'
      }
    );
    subtitle.setOrigin(0.5);

    const instruction = this.add.text(
      this.scale.width / 2,
      350,
      '操作说明：\nA/← 控制左弹板\nD/→ 或 空格 控制右弹板\n按住蓄力键发射弹球',
      {
        fontSize: '16px',
        fill: '#fff',
        align: 'center'
      }
    );
    instruction.setOrigin(0.5);
  }
}
