import { 
  GameState, 
  Player, 
  Enemy, 
  MapData, 
  Position, 
  TileType,
  Room,
  CombatStats
} from '../types';
import { 
  DrunkardWalkGenerator, 
  CellularAutomataGenerator, 
  BSPTreeGenerator 
} from '../algorithms';
import { EnemyFactory, EnemyType, FiniteStateMachine } from '../fsm';
import { MapUtils } from '../algorithms/MapUtils';

export enum MapAlgorithm {
  DRUNKARD_WALK = 'drunkard_walk',
  CELLULAR_AUTOMATA = 'cellular_automata',
  BSP_TREE = 'bsp_tree',
}

export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  mapAlgorithm: MapAlgorithm;
  playerStartStats: Partial<CombatStats>;
  enemyCount: number;
  dungeonLevel: number;
}

const DEFAULT_CONFIG: GameConfig = {
  mapWidth: 40,
  mapHeight: 30,
  mapAlgorithm: MapAlgorithm.BSP_TREE,
  playerStartStats: {
    maxHp: 100,
    attack: 10,
    defense: 5,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
  },
  enemyCount: 8,
  dungeonLevel: 1,
};

export class GameEngine {
  private gameState: GameState;
  private config: GameConfig;
  private enemyFSMs: Map<string, FiniteStateMachine>;
  private gameOver: boolean;
  private victory: boolean;
  private messages: string[];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.gameState = this.initializeGame();
    this.enemyFSMs = new Map();
    this.gameOver = false;
    this.victory = false;
    this.messages = [];
    
    this.initializeEnemies();
    this.updateFOV();
    
    this.addWelcomeMessage();
  }

  private addWelcomeMessage(): void {
    if (this.config.dungeonLevel === 1) {
      this.messages.push('欢迎来到程序化地牢探险！');
      this.messages.push('使用方向键或 WASD 移动，探索地牢...');
      this.messages.push('找到楼梯 > 后按 . 或 Shift+> 进入下一层！');
    }
  }

  public addPublicMessage(message: string): void {
    this.messages.push(message);
  }

  private initializeGame(): GameState {
    const map = this.generateMap();
    const player = this.createPlayer(map);
    
    return {
      map,
      player,
      enemies: [],
      turn: 0,
      gameOver: false,
      victory: false,
      messages: [],
    };
  }

  private generateMap(): MapData {
    const { mapWidth, mapHeight, mapAlgorithm } = this.config;
    
    switch (mapAlgorithm) {
      case MapAlgorithm.DRUNKARD_WALK:
        const drunkardGenerator = new DrunkardWalkGenerator({
          width: mapWidth,
          height: mapHeight,
        });
        return drunkardGenerator.generate();
      
      case MapAlgorithm.CELLULAR_AUTOMATA:
        const cellularGenerator = new CellularAutomataGenerator({
          width: mapWidth,
          height: mapHeight,
        });
        return cellularGenerator.generate();
      
      case MapAlgorithm.BSP_TREE:
      default:
        const bspGenerator = new BSPTreeGenerator({
          width: mapWidth,
          height: mapHeight,
        });
        return bspGenerator.generate();
    }
  }

  private createPlayer(map: MapData): Player {
    const startRoom = map.rooms.length > 0 
      ? map.rooms[0] 
      : this.findStartPosition(map);
    
    const startPos = startRoom.center;
    
    return {
      id: 'player',
      position: { ...startPos },
      name: '勇者',
      char: '@',
      color: '#fbbf24',
      isPlayer: true,
      hp: this.config.playerStartStats.maxHp || 100,
      maxHp: this.config.playerStartStats.maxHp || 100,
      attack: this.config.playerStartStats.attack || 10,
      defense: this.config.playerStartStats.defense || 5,
      level: this.config.playerStartStats.level || 1,
      xp: this.config.playerStartStats.xp || 0,
      xpToNextLevel: this.config.playerStartStats.xpToNextLevel || 100,
    };
  }

  private findStartPosition(map: MapData): Room {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y][x].passable) {
          return {
            x, y,
            width: 1,
            height: 1,
            center: { x, y },
          };
        }
      }
    }
    return { x: 1, y: 1, width: 1, height: 1, center: { x: 1, y: 1 } };
  }

  private initializeEnemies(): void {
    const { enemyCount, dungeonLevel } = this.config;
    const { map } = this.gameState;
    
    let enemyId = 0;
    const placedPositions = new Set<string>();
    placedPositions.add(`${this.gameState.player.position.x},${this.gameState.player.position.y}`);

    for (let i = 0; i < enemyCount; i++) {
      const room = this.getRandomRoom(map, placedPositions);
      if (!room) continue;

      const pos = this.getRandomPositionInRoom(room, placedPositions);
      if (!pos) continue;

      placedPositions.add(`${pos.x},${pos.y}`);

      const enemyType = EnemyFactory.getRandomEnemyType();
      const { enemy, fsm } = EnemyFactory.createEnemy(
        enemyType,
        pos,
        `enemy_${enemyId++}`,
        dungeonLevel
      );

      this.gameState.enemies.push(enemy);
      this.enemyFSMs.set(enemy.id, fsm);
    }
  }

  private getRandomRoom(map: MapData, excludedPositions: Set<string>): Room | null {
    if (map.rooms.length <= 1) return null;
    
    const validRooms = map.rooms.filter((room, index) => {
      if (index === 0) return false;
      
      const key = `${room.center.x},${room.center.y}`;
      return !excludedPositions.has(key);
    });

    if (validRooms.length === 0) return null;
    return validRooms[Math.floor(Math.random() * validRooms.length)];
  }

  private getRandomPositionInRoom(room: Room, excludedPositions: Set<string>): Position | null {
    const attempts = 50;
    
    for (let i = 0; i < attempts; i++) {
      const x = room.x + Math.floor(Math.random() * room.width);
      const y = room.y + Math.floor(Math.random() * room.height);
      const key = `${x},${y}`;
      
      if (!excludedPositions.has(key)) {
        return { x, y };
      }
    }
    
    return null;
  }

  private updateFOV(): void {
    MapUtils.calculateFOV(
      this.gameState.player.position,
      this.gameState.map,
      8
    );
  }

  movePlayer(dx: number, dy: number): boolean {
    if (this.gameOver) return false;

    const { player, map } = this.gameState;
    const newX = player.position.x + dx;
    const newY = player.position.y + dy;

    if (!MapUtils.isInBounds(newX, newY, map.width, map.height)) {
      return false;
    }

    const targetTile = map.tiles[newY][newX];

    if (!targetTile.passable) {
      return false;
    }

    const enemy = this.getEnemyAtPosition(newX, newY);
    if (enemy) {
      this.attackEnemy(player, enemy);
      this.endTurn();
      return true;
    }

    player.position = { x: newX, y: newY };
    this.updateFOV();

    if (targetTile.type === TileType.STAIRS) {
      this.addMessage('你发现了通往下一层的楼梯！');
    }

    this.endTurn();
    return true;
  }

  private getEnemyAtPosition(x: number, y: number): Enemy | undefined {
    return this.gameState.enemies.find(
      enemy => enemy.position.x === x && enemy.position.y === y
    );
  }

  private attackEnemy(attacker: Player, defender: Enemy): void {
    const damage = Math.max(
      1,
      attacker.attack - defender.defense + Math.floor(Math.random() * 5) - 2
    );
    
    defender.hp -= damage;
    
    this.addMessage(`你对 ${defender.name} 造成了 ${damage} 点伤害！`);

    if (defender.hp <= 0) {
      this.killEnemy(defender);
    }
  }

  private killEnemy(enemy: Enemy): void {
    const xpGain = EnemyFactory.getXpReward(
      enemy.type,
      enemy.level
    );
    
    this.gameState.player.xp += xpGain;
    this.addMessage(`你击败了 ${enemy.name}，获得 ${xpGain} 经验值！`);

    this.checkLevelUp();

    const index = this.gameState.enemies.indexOf(enemy);
    if (index > -1) {
      this.gameState.enemies.splice(index, 1);
    }
    this.enemyFSMs.delete(enemy.id);

    if (this.gameState.enemies.length === 0) {
      this.victory = true;
      this.gameOver = true;
      this.addMessage('恭喜！你击败了所有敌人！');
    }
  }

  private checkLevelUp(): void {
    const { player } = this.gameState;
    
    while (player.xp >= player.xpToNextLevel) {
      player.xp -= player.xpToNextLevel;
      player.level++;
      
      player.maxHp += 20;
      player.hp = player.maxHp;
      player.attack += 3;
      player.defense += 2;
      player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);

      this.addMessage(`恭喜！你升到了 ${player.level} 级！`);
    }
  }

  waitTurn(): void {
    if (this.gameOver) return;
    this.endTurn();
  }

  private endTurn(): void {
    this.gameState.turn++;
    
    this.checkLevelUp();
    
    this.processEnemyTurn();
    
    if (this.gameState.player.hp <= 0) {
      this.gameOver = true;
      this.victory = false;
      this.addMessage('你被击败了...游戏结束。');
    }
  }

  private processEnemyTurn(): void {
    for (const enemy of this.gameState.enemies) {
      const fsm = this.enemyFSMs.get(enemy.id);
      if (!fsm) continue;

      const wasAdjacent = this.isAdjacent(enemy.position, this.gameState.player.position);

      fsm.update(this.gameState.player.position, this.gameState);

      const isNowAdjacent = this.isAdjacent(enemy.position, this.gameState.player.position);

      if (isNowAdjacent) {
        const canSee = MapUtils.lineOfSight(
          enemy.position, 
          this.gameState.player.position, 
          this.gameState.map, 
          8
        );
        
        if (canSee) {
          const damage = Math.max(
            1,
            enemy.attack - this.gameState.player.defense + Math.floor(Math.random() * 3) - 1
          );
          this.gameState.player.hp -= damage;
          this.addMessage(`${enemy.name} 攻击了你，造成 ${damage} 点伤害！`);
        }
      }
    }
  }

  private isAdjacent(pos1: Position, pos2: Position): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  }

  private addMessage(message: string): void {
    this.messages.push(message);
    if (this.messages.length > 50) {
      this.messages.shift();
    }
  }

  restartGame(): void {
    this.gameState = this.initializeGame();
    this.enemyFSMs.clear();
    this.gameOver = false;
    this.victory = false;
    this.messages = ['新的冒险开始了！'];
    this.initializeEnemies();
    this.updateFOV();
  }

  goToNextLevel(): boolean {
    const { player, map } = this.gameState;
    const tile = map.tiles[player.position.y][player.position.x];
    
    if (tile.type !== TileType.STAIRS) {
      return false;
    }

    this.config.dungeonLevel++;
    this.config.enemyCount = Math.min(15, this.config.enemyCount + 2);
    
    const savedStats: Partial<CombatStats> = {
      maxHp: this.gameState.player.maxHp,
      hp: this.gameState.player.hp,
      attack: this.gameState.player.attack,
      defense: this.gameState.player.defense,
      level: this.gameState.player.level,
      xp: this.gameState.player.xp,
      xpToNextLevel: this.gameState.player.xpToNextLevel,
    };
    
    this.config.playerStartStats = savedStats;
    
    this.gameState = this.initializeGame();
    this.enemyFSMs.clear();
    this.messages = [`你进入了地牢第 ${this.config.dungeonLevel} 层！`];
    this.initializeEnemies();
    this.updateFOV();
    
    this.addMessage(`地牢变得更危险了...`);
    
    return true;
  }

  getGameState(): Readonly<GameState> {
    return this.gameState;
  }

  getMessages(): Readonly<string[]> {
    return this.messages;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  isVictory(): boolean {
    return this.victory;
  }

  getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  getDungeonLevel(): number {
    return this.config.dungeonLevel;
  }
}
