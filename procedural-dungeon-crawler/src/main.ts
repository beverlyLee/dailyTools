import { GameEngine, MapAlgorithm } from './game/GameEngine';
import { GameRenderer } from './rendering/GameRenderer';
import { TileType, Position } from './types';

interface DamageEffect {
  position: Position;
  damage: number;
  startTime: number;
  duration: number;
  color: string;
}

interface FlashEffect {
  position: Position;
  startTime: number;
  duration: number;
  color: string;
}

class DungeonCrawlerGame {
  private gameEngine: GameEngine;
  private renderer: GameRenderer;
  private canvas: HTMLCanvasElement;
  private keysPressed: Set<string>;
  private lastMoveTime: number;
  private moveCooldown: number;
  private damageEffects: DamageEffect[];
  private flashEffects: FlashEffect[];

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.gameEngine = new GameEngine({
      mapWidth: 60,
      mapHeight: 45,
      mapAlgorithm: MapAlgorithm.BSP_TREE,
      enemyCount: 10,
      dungeonLevel: 1,
    });

    this.renderer = new GameRenderer(this.canvas, {
      tileSize: 24,
      fontSize: 20,
      viewportWidth: 33,
      viewportHeight: 25,
    });

    this.keysPressed = new Set();
    this.lastMoveTime = 0;
    this.moveCooldown = 150;
    this.damageEffects = [];
    this.flashEffects = [];

    this.updateFloorDisplay();
    this.setupEventListeners();
    this.gameLoop();
  }

  private updateFloorDisplay(): void {
    const floorElement = document.getElementById('floor-level');
    if (floorElement) {
      const level = this.gameEngine.getDungeonLevel();
      floorElement.textContent = `地牢第 ${level} 层`;
    }
  }

  private checkStairsAndPrompt(): void {
    const gameState = this.gameEngine.getGameState();
    const { player, map } = gameState;
    const tile = map.tiles[player.position.y][player.position.x];
    
    if (tile.type === TileType.STAIRS) {
      const messages = this.gameEngine.getMessages();
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : '';
      
      if (!lastMessage.includes('按 . 或 Shift+>')) {
        this.gameEngine.addPublicMessage('你发现了通往下一层的楼梯！按 . 或 Shift+> 下楼。');
      }
    }
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
      this.keysPressed.delete(event.key.toLowerCase());
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (this.gameEngine.isGameOver()) {
      if (key === 'r') {
        this.gameEngine = new GameEngine({
          mapWidth: 60,
          mapHeight: 45,
          mapAlgorithm: MapAlgorithm.BSP_TREE,
          enemyCount: 10,
          dungeonLevel: 1,
        });
        this.updateFloorDisplay();
        this.damageEffects = [];
        this.flashEffects = [];
      }
      return;
    }

    switch (key) {
      case 'arrowup':
      case 'w':
      case 'arrowdown':
      case 's':
      case 'arrowleft':
      case 'a':
      case 'arrowright':
      case 'd':
      case ' ':
      case '>':
      case '.':
        this.keysPressed.add(key);
        event.preventDefault();
        break;
    }
  }

  private processKeyPress(): void {
    const now = Date.now();
    if (now - this.lastMoveTime < this.moveCooldown) return;

    if (this.gameEngine.isGameOver()) return;

    let actionTaken = false;
    const gameState = this.gameEngine.getGameState();

    if (this.keysPressed.has('arrowup') || this.keysPressed.has('w')) {
      actionTaken = this.tryMove(0, -1);
    } else if (this.keysPressed.has('arrowdown') || this.keysPressed.has('s')) {
      actionTaken = this.tryMove(0, 1);
    } else if (this.keysPressed.has('arrowleft') || this.keysPressed.has('a')) {
      actionTaken = this.tryMove(-1, 0);
    } else if (this.keysPressed.has('arrowright') || this.keysPressed.has('d')) {
      actionTaken = this.tryMove(1, 0);
    } else if (this.keysPressed.has(' ')) {
      this.gameEngine.waitTurn();
      actionTaken = true;
      this.keysPressed.delete(' ');
    } else if (this.keysPressed.has('>') || this.keysPressed.has('.')) {
      const { player, map } = gameState;
      const currentTile = map.tiles[player.position.y][player.position.x];
      
      if (currentTile.type === TileType.STAIRS) {
        const oldLevel = this.gameEngine.getDungeonLevel();
        
        const savedStats = {
          maxHp: gameState.player.maxHp,
          hp: gameState.player.hp,
          attack: gameState.player.attack,
          defense: gameState.player.defense,
          level: gameState.player.level,
          xp: gameState.player.xp,
          xpToNextLevel: gameState.player.xpToNextLevel,
        };
        
        this.gameEngine = new GameEngine({
          mapWidth: 60,
          mapHeight: 45,
          mapAlgorithm: MapAlgorithm.BSP_TREE,
          enemyCount: Math.min(15, 10 + (oldLevel) * 2),
          dungeonLevel: oldLevel + 1,
          playerStartStats: savedStats,
        });
        
        this.updateFloorDisplay();
        this.gameEngine.addPublicMessage(`你下降到了地牢第 ${oldLevel + 1} 层！`);
        this.gameEngine.addPublicMessage('敌人变得更强了，小心行事！');
        this.damageEffects = [];
        this.flashEffects = [];
      } else {
        this.gameEngine.addPublicMessage('你需要站在楼梯上才能下楼！');
      }
      actionTaken = true;
      this.keysPressed.delete('>');
      this.keysPressed.delete('.');
    }

    if (actionTaken) {
      this.lastMoveTime = now;
    }
  }

  private tryMove(dx: number, dy: number): boolean {
    const gameState = this.gameEngine.getGameState();
    const { player } = gameState;
    const newX = player.position.x + dx;
    const newY = player.position.y + dy;

    const enemy = gameState.enemies.find(
      e => e.position.x === newX && e.position.y === newY
    );

    if (enemy) {
      const beforeHp = enemy.hp;
      const result = this.gameEngine.movePlayer(dx, dy);
      
      if (result) {
        const damage = beforeHp - enemy.hp;
        if (damage > 0) {
          this.addDamageEffect(enemy.position, damage, '#fbbf24');
          this.addFlashEffect(enemy.position, '#ffffff');
        }
        
        if (enemy.hp <= 0) {
          this.addFlashEffect(enemy.position, '#ef4444');
        }
      }
      
      return result;
    }

    return this.gameEngine.movePlayer(dx, dy);
  }

  private addDamageEffect(position: Position, damage: number, color: string): void {
    this.damageEffects.push({
      position: { ...position },
      damage,
      startTime: Date.now(),
      duration: 800,
      color,
    });
  }

  private addFlashEffect(position: Position, color: string): void {
    this.flashEffects.push({
      position: { ...position },
      startTime: Date.now(),
      duration: 200,
      color,
    });
  }

  private updateEffects(): void {
    const now = Date.now();
    this.damageEffects = this.damageEffects.filter(
      effect => now - effect.startTime < effect.duration
    );
    this.flashEffects = this.flashEffects.filter(
      effect => now - effect.startTime < effect.duration
    );
  }

  private renderEffects(): void {
    const gameState = this.gameEngine.getGameState();
    const { player, map } = gameState;
    const config = this.renderer.getConfig();
    const { tileSize, viewportWidth, viewportHeight } = config;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const offsetX = Math.max(
      0,
      Math.min(
        player.position.x - Math.floor(viewportWidth / 2),
        map.width - viewportWidth
      )
    );
    const offsetY = Math.max(
      0,
      Math.min(
        player.position.y - Math.floor(viewportHeight / 2),
        map.height - viewportHeight
      )
    );

    const now = Date.now();

    for (const effect of this.flashEffects) {
      const screenX = (effect.position.x - offsetX) * tileSize;
      const screenY = (effect.position.y - offsetY) * tileSize;
      
      if (screenX < 0 || screenX >= this.canvas.width || 
          screenY < 0 || screenY >= this.canvas.height) continue;

      const progress = (now - effect.startTime) / effect.duration;
      const alpha = 1 - progress;
      
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
      ctx.globalAlpha = 1;
    }

    for (const effect of this.damageEffects) {
      const screenX = (effect.position.x - offsetX) * tileSize + tileSize / 2;
      const screenY = (effect.position.y - offsetY) * tileSize;
      
      if (screenX < 0 || screenX >= this.canvas.width || 
          screenY < 0 || screenY >= this.canvas.height) continue;

      const progress = (now - effect.startTime) / effect.duration;
      const alpha = 1 - progress;
      const yOffset = progress * 40;
      
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText(`-${effect.damage}`, screenX, screenY - yOffset);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  private gameLoop(): void {
    this.processKeyPress();
    this.updateEffects();
    this.checkStairsAndPrompt();

    const gameState = this.gameEngine.getGameState();
    const messages = this.gameEngine.getMessages();

    this.renderer.render(gameState, messages);
    this.renderEffects();

    if (this.gameEngine.isGameOver()) {
      this.renderer.showGameOver(this.gameEngine.isVictory());
    }

    requestAnimationFrame(() => this.gameLoop());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new DungeonCrawlerGame();
    console.log('地牢探险游戏已启动！');
  } catch (error) {
    console.error('游戏初始化失败:', error);
  }
});
