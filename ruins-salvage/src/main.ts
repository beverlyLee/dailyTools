import { GameScene } from './scenes/GameScene';

window.addEventListener('load', () => {
  const container = document.getElementById('game-container')!;
  const scene = new GameScene(container);
  scene.start();
});
