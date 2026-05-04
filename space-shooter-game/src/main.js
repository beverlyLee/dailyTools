import Phaser from 'phaser';
import { GameConfig } from './config.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

/**
 * 太空射击游戏主入口
 * 初始化Phaser游戏引擎并配置所有场景
 */
const config = {
  type: Phaser.AUTO,
  width: GameConfig.WIDTH,
  height: GameConfig.HEIGHT,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: GameConfig.DEBUG
    }
  },
  scene: [
    PreloadScene,
    MainMenuScene,
    GameScene,
    GameOverScene
  ],
  pixelArt: false,
  roundPixels: true
};

// 创建游戏实例
const game = new Phaser.Game(config);

export default game;
