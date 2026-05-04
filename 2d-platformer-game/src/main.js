import Phaser from 'phaser';
import { GAME_CONFIG } from './config';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';
import MenuScene from './scenes/MenuScene';
import UIScene from './scenes/UIScene';
import HelpScene from './scenes/HelpScene';

const config = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game',
  physics: GAME_CONFIG.physics,
  scene: [
    BootScene,
    MenuScene,
    HelpScene,
    GameScene,
    UIScene
  ]
};

const game = new Phaser.Game(config);

export default game;
