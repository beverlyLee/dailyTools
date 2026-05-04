import Phaser from 'phaser';
import { GAME_CONFIG } from './config.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GameScene from './scenes/GameScene.js';
import EditorScene from './scenes/EditorScene.js';
import { HighScoreManager } from './systems/HighScoreManager.js';
import { LevelManager } from './systems/LevelManager.js';

class GameApp {
  constructor() {
    this.highScoreManager = new HighScoreManager();
    this.levelManager = new LevelManager();
    this.currentLevel = null;
    this.init();
  }

  init() {
    this.game = new Phaser.Game({
      ...GAME_CONFIG,
      scene: [MainMenuScene, GameScene, EditorScene]
    });

    this.game.highScoreManager = this.highScoreManager;
    this.game.levelManager = this.levelManager;

    this.setupEventListeners();
    this.updateHighScoresDisplay();
  }

  setupEventListeners() {
    document.getElementById('start-game').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('level-editor').addEventListener('click', () => {
      this.startEditor();
    });

    document.getElementById('load-level').addEventListener('click', () => {
      this.loadLevelDialog();
    });
  }

  startGame(levelData = null) {
    document.getElementById('main-menu').style.display = 'none';
    this.game.scene.stop('MainMenuScene');
    this.game.scene.stop('EditorScene');
    this.game.scene.start('GameScene', { levelData });
  }

  startEditor() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('editor-tools').style.display = 'flex';
    this.game.scene.stop('MainMenuScene');
    this.game.scene.stop('GameScene');
    this.game.scene.start('EditorScene');
  }

  loadLevelDialog() {
    const levels = this.levelManager.getAllLevels();
    if (levels.length === 0) {
      alert('没有保存的关卡！');
      return;
    }

    const levelNames = levels.map((l, i) => `${i + 1}. ${l.name || '未命名关卡'}`).join('\n');
    const index = prompt(`选择要加载的关卡:\n${levelNames}\n\n输入编号:`);
    
    if (index) {
      const idx = parseInt(index) - 1;
      if (idx >= 0 && idx < levels.length) {
        this.startGame(levels[idx]);
      }
    }
  }

  updateHighScoresDisplay() {
    const scores = this.highScoreManager.getTopScores(5);
    const list = document.getElementById('high-scores-list');
    
    if (scores.length === 0) {
      list.innerHTML = '<li>暂无记录</li>';
    } else {
      list.innerHTML = scores.map((s, i) => 
        `<li>${i + 1}. ${s.score} 分 - ${new Date(s.date).toLocaleDateString()}</li>`
      ).join('');
    }
  }
}

window.gameApp = new GameApp();
