import { GameEngine } from './game/GameEngine';
import { Direction } from './types';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('Game container not found');
    return;
  }
  
  // 创建游戏引擎
  const gameEngine = new GameEngine(container);
  
  // 获取UI元素
  const moveCountEl = document.getElementById('move-count')!;
  const currentLevelEl = document.getElementById('current-level')!;
  const boxesOnTargetEl = document.getElementById('boxes-on-target')!;
  const totalBoxesEl = document.getElementById('total-boxes')!;
  
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
  
  const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
  const winMessage = document.getElementById('win-message')!;
  const finalMovesEl = document.getElementById('final-moves')!;
  const nextLevelBtn = document.getElementById('next-level-btn') as HTMLButtonElement;
  
  // 更新UI
  function updateUI(): void {
    moveCountEl.textContent = gameEngine.getMoveCount().toString();
    currentLevelEl.textContent = (gameEngine.getCurrentLevel() + 1).toString();
    boxesOnTargetEl.textContent = gameEngine.getBoxesOnTargetCount().toString();
    totalBoxesEl.textContent = gameEngine.getTotalBoxes().toString();
    
    // 更新按钮状态
    undoBtn.disabled = !gameEngine.canUndo();
    redoBtn.disabled = !gameEngine.canRedo();
  }
  
  // 显示胜利消息
  function showWinMessage(): void {
    finalMovesEl.textContent = gameEngine.getMoveCount().toString();
    winMessage.style.display = 'block';
  }
  
  // 隐藏胜利消息
  function hideWinMessage(): void {
    winMessage.style.display = 'none';
  }
  
  // 设置回调
  gameEngine.setOnMoveCallback(updateUI);
  gameEngine.setOnWinCallback(showWinMessage);
  gameEngine.setOnLevelChangeCallback(() => {
    updateUI();
    hideWinMessage();
    levelSelect.value = gameEngine.getCurrentLevel().toString();
  });
  
  // 键盘事件处理
  function handleKeydown(e: KeyboardEvent): void {
    if (gameEngine.getIsGameWon()) return;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        gameEngine.move(Direction.UP);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        gameEngine.move(Direction.DOWN);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        gameEngine.move(Direction.LEFT);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        gameEngine.move(Direction.RIGHT);
        break;
      case 'z':
      case 'Z':
        e.preventDefault();
        gameEngine.undo();
        break;
      case 'y':
      case 'Y':
        e.preventDefault();
        gameEngine.redo();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        gameEngine.resetLevel();
        break;
    }
  }
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown);
  
  // 按钮事件
  undoBtn.addEventListener('click', () => {
    gameEngine.undo();
  });
  
  redoBtn.addEventListener('click', () => {
    gameEngine.redo();
  });
  
  resetBtn.addEventListener('click', () => {
    gameEngine.resetLevel();
  });
  
  saveBtn.addEventListener('click', () => {
    gameEngine.saveGame();
    alert('游戏进度已保存！');
  });
  
  loadBtn.addEventListener('click', () => {
    const success = gameEngine.loadGame();
    if (success) {
      alert('游戏进度已加载！');
    } else {
      alert('没有找到保存的游戏进度！');
    }
  });
  
  // 关卡选择
  levelSelect.addEventListener('change', (e) => {
    const levelIndex = parseInt((e.target as HTMLSelectElement).value);
    gameEngine.loadLevel(levelIndex);
  });
  
  // 下一关按钮
  nextLevelBtn.addEventListener('click', () => {
    gameEngine.nextLevel();
  });
  
  // 动画循环
  function animate(): void {
    requestAnimationFrame(animate);
    gameEngine.render();
  }
  
  // 加载第一个关卡
  gameEngine.loadLevel(0);
  
  // 开始动画循环
  animate();
  
  // 清理函数
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', handleKeydown);
    gameEngine.dispose();
  });
  
  console.log('3D Sokoban Game initialized successfully!');
});
