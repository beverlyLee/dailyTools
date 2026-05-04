export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: TileType;
  passable: boolean;
  visible: boolean;
  explored: boolean;
}

export enum TileType {
  WALL = 0,
  FLOOR = 1,
  DOOR = 2,
  STAIRS = 3,
}

export enum EnemyType {
  GOBLIN = 'goblin',
  ORC = 'orc',
  SKELETON = 'skeleton',
  SLIME = 'slime',
  BAT = 'bat',
}

export interface MapData {
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Position;
}

export interface Entity {
  id: string;
  position: Position;
  name: string;
  char: string;
  color: string;
  isPlayer?: boolean;
}

export interface CombatStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface GameState {
  map: MapData;
  player: Player;
  enemies: Enemy[];
  turn: number;
  gameOver: boolean;
  victory: boolean;
  messages: string[];
}

export interface Player extends Entity, CombatStats {
  isPlayer: true;
}

export interface Enemy extends Entity, CombatStats {
  ai: AIState;
  type: EnemyType;
}

export enum AIState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  FLEE = 'flee',
}

export interface FSMState {
  name: AIState;
  onEnter?: (enemy: Enemy, player: Position) => void;
  onUpdate: (enemy: Enemy, player: Position, gameState: GameState) => AIState;
  onExit?: (enemy: Enemy, player: Position) => void;
}
