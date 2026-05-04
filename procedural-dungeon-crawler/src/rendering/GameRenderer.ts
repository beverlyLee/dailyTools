import { GameState, TileType, Entity, Enemy, Player } from '../types';
import { MapUtils } from '../algorithms/MapUtils';

export interface RenderConfig {
  tileSize: number;
  fontSize: number;
  fontFamily: string;
  viewportWidth: number;
  viewportHeight: number;
}

const DEFAULT_CONFIG: RenderConfig = {
  tileSize: 24,
  fontSize: 20,
  fontFamily: 'monospace',
  viewportWidth: 33,
  viewportHeight: 25,
};

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.adjustCanvasSize();
  }

  private adjustCanvasSize(): void {
    const { viewportWidth, viewportHeight, tileSize } = this.config;
    this.canvas.width = viewportWidth * tileSize;
    this.canvas.height = viewportHeight * tileSize;
  }

  render(gameState: GameState, messages: readonly string[]): void {
    this.clear();
    this.renderMap(gameState);
    this.renderEntities(gameState);
    this.renderUI(gameState, messages);
  }

  private clear(): void {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderMap(gameState: GameState): void {
    const { player, map } = gameState;
    const { tileSize, viewportWidth, viewportHeight } = this.config;

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

    for (let y = 0; y < viewportHeight; y++) {
      for (let x = 0; x < viewportWidth; x++) {
        const mapX = offsetX + x;
        const mapY = offsetY + y;

        if (mapX >= map.width || mapY >= map.height) continue;

        const tile = map.tiles[mapY][mapX];
        const screenX = x * tileSize;
        const screenY = y * tileSize;

        if (!tile.explored) {
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
          continue;
        }

        const dimFactor = tile.visible ? 1.0 : 0.3;

        switch (tile.type) {
          case TileType.WALL:
            this.ctx.fillStyle = this.dimColor('#3a3a5a', dimFactor);
            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
            this.ctx.fillStyle = this.dimColor('#4a4a7a', dimFactor);
            this.ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
            break;

          case TileType.FLOOR:
            this.ctx.fillStyle = this.dimColor('#1a1a2e', dimFactor);
            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
            this.ctx.fillStyle = this.dimColor('#16213e', dimFactor);
            this.ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
            break;

          case TileType.STAIRS:
            this.ctx.fillStyle = this.dimColor('#1a1a2e', dimFactor);
            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
            this.ctx.fillStyle = this.dimColor('#fbbf24', dimFactor);
            this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('>', screenX + tileSize / 2, screenY + tileSize / 2);
            break;
        }

        if (!tile.visible && tile.explored) {
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }
  }

  private renderEntities(gameState: GameState): void {
    const { player, map, enemies } = gameState;
    const { tileSize, viewportWidth, viewportHeight } = this.config;

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

    for (const enemy of enemies) {
      const tile = map.tiles[enemy.position.y][enemy.position.x];
      if (!tile.visible) continue;

      const screenX = (enemy.position.x - offsetX) * tileSize;
      const screenY = (enemy.position.y - offsetY) * tileSize;

      if (screenX < 0 || screenX >= this.canvas.width || 
          screenY < 0 || screenY >= this.canvas.height) {
        continue;
      }

      this.renderEntity(enemy, screenX, screenY);
      this.renderEnemyHealthBar(enemy, screenX, screenY);
    }

    const playerScreenX = (player.position.x - offsetX) * tileSize;
    const playerScreenY = (player.position.y - offsetY) * tileSize;
    this.renderPlayer(player, playerScreenX, playerScreenY);
  }

  private renderEnemyHealthBar(enemy: Enemy, screenX: number, screenY: number): void {
    const { tileSize } = this.config;
    
    const barWidth = tileSize - 4;
    const barHeight = 4;
    const barX = screenX + 2;
    const barY = screenY - 6;
    
    const hpRatio = enemy.hp / enemy.maxHp;
    
    this.ctx.fillStyle = '#2a2a4e';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    let fillColor = '#ef4444';
    if (hpRatio > 0.5) {
      fillColor = '#22c55e';
    } else if (hpRatio > 0.25) {
      fillColor = '#f59e0b';
    }
    
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    
    this.ctx.strokeStyle = '#4a4a6a';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private renderEntity(entity: Entity, screenX: number, screenY: number): void {
    const { tileSize, fontSize, fontFamily } = this.config;

    this.ctx.fillStyle = entity.color;
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.shadowColor = entity.color;
    this.ctx.shadowBlur = 5;
    
    this.ctx.fillText(
      entity.char,
      screenX + tileSize / 2,
      screenY + tileSize / 2
    );

    this.ctx.shadowBlur = 0;
  }

  private renderPlayer(player: Entity, screenX: number, screenY: number): void {
    const { tileSize, fontSize, fontFamily } = this.config;

    this.ctx.fillStyle = player.color;
    this.ctx.font = `bold ${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.shadowColor = player.color;
    this.ctx.shadowBlur = 10;
    
    this.ctx.fillText(
      player.char,
      screenX + tileSize / 2,
      screenY + tileSize / 2
    );

    this.ctx.shadowBlur = 0;
  }

  private renderUI(gameState: GameState, messages: readonly string[]): void {
    this.updateStatsUI(gameState);
    this.updateLogUI(messages);
  }

  private updateStatsUI(gameState: GameState): void {
    const { player } = gameState;

    const hpElement = document.getElementById('hp');
    if (hpElement) {
      hpElement.textContent = `${player.hp}/${player.maxHp}`;
      const hpRatio = player.hp / player.maxHp;
      if (hpRatio <= 0.25) {
        hpElement.style.color = '#ef4444';
      } else if (hpRatio <= 0.5) {
        hpElement.style.color = '#f97316';
      } else {
        hpElement.style.color = '#e94560';
      }
    }

    const hpFillElement = document.getElementById('hp-fill');
    if (hpFillElement) {
      const hpRatio = player.hp / player.maxHp;
      hpFillElement.style.width = `${hpRatio * 100}%`;
      
      hpFillElement.classList.remove('high', 'medium');
      if (hpRatio > 0.5) {
        hpFillElement.classList.add('high');
      } else if (hpRatio > 0.25) {
        hpFillElement.classList.add('medium');
      }
    }

    const attackElement = document.getElementById('attack');
    if (attackElement) {
      attackElement.textContent = `${player.attack}`;
    }

    const defenseElement = document.getElementById('defense');
    if (defenseElement) {
      defenseElement.textContent = `${player.defense}`;
    }

    const levelElement = document.getElementById('level');
    if (levelElement) {
      levelElement.textContent = `${player.level}`;
    }

    const xpElement = document.getElementById('xp');
    if (xpElement) {
      xpElement.textContent = `${player.xp}/${player.xpToNextLevel}`;
    }

    const xpFillElement = document.getElementById('xp-fill');
    if (xpFillElement) {
      const xpRatio = player.xp / player.xpToNextLevel;
      xpFillElement.style.width = `${xpRatio * 100}%`;
    }
  }

  private updateLogUI(messages: readonly string[]): void {
    const logElement = document.getElementById('log');
    if (!logElement) return;

    logElement.innerHTML = '';

    const recentMessages = messages.slice(-10);
    
    for (const message of recentMessages) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = message;
      logElement.appendChild(entry);
    }

    logElement.scrollTop = logElement.scrollHeight;
  }

  private dimColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  showGameOver(victory: boolean): void {
    const { viewportWidth, viewportHeight, tileSize } = this.config;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (victory) {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(
        '胜利！',
        this.canvas.width / 2,
        this.canvas.height / 2 - 40
      );
    } else {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillText(
        '游戏结束',
        this.canvas.width / 2,
        this.canvas.height / 2 - 40
      );
    }

    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(
      '按 R 键重新开始',
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );
  }

  getConfig(): Readonly<RenderConfig> {
    return this.config;
  }
}
