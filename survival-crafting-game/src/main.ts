import Phaser from 'phaser';
import { GAME_CONFIG } from './config';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [GameScene],
  backgroundColor: '#1a1a2e'
};

class GameApp {
  private game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game(config);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 可以在这里添加全局事件监听
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    // 处理窗口大小变化
    const container = document.getElementById('game-container');
    if (container) {
      // 保持16:9的比例
      const aspectRatio = 16 / 9;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let newWidth = windowWidth;
      let newHeight = windowWidth / aspectRatio;
      
      if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = windowHeight * aspectRatio;
      }
      
      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;
    }
  }

  public getGame(): Phaser.Game {
    return this.game;
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  const gameApp = new GameApp();
  (window as any).gameApp = gameApp;
  console.log('生存建造游戏已启动!');
  console.log('控制说明:');
  console.log('  - WASD / 方向键: 移动');
  console.log('  - 左键点击: 采集资源 / 放置建筑');
  console.log('  - 右键点击: 取消选择建筑');
  console.log('  - 数字键 1-6: 选择建筑类型');
  console.log('建筑类型:');
  console.log('  1: 营火 (需要: 木材x5, 木棍x2)');
  console.log('  2: 木墙 (需要: 木材x10)');
  console.log('  3: 石墙 (需要: 石头x15)');
  console.log('  4: 木地板 (需要: 木板x4)');
  console.log('  5: 储物箱 (需要: 木材x20, 木棍x5)');
  console.log('  6: 床 (需要: 木材x15, 木棍x10)');
});

export { GameApp };
