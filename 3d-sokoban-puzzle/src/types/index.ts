// 游戏元素类型
export enum TileType {
  EMPTY = 0,
  WALL = 1,
  PLAYER = 2,
  BOX = 3,
  TARGET = 4,
  BOX_ON_TARGET = 5,
  PLAYER_ON_TARGET = 6
}

// 方向类型
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

// 方向向量
export const DIRECTION_VECTORS: Record<Direction, { x: number; z: number }> = {
  [Direction.UP]: { x: 0, z: -1 },
  [Direction.DOWN]: { x: 0, z: 1 },
  [Direction.LEFT]: { x: -1, z: 0 },
  [Direction.RIGHT]: { x: 1, z: 0 }
};

// 关卡数据
export interface LevelData {
  name: string;
  grid: TileType[][];
  theme: 'forest' | 'ice' | 'desert' | 'space';
}

// 游戏状态
export interface GameState {
  grid: TileType[][];
  playerPos: { x: number; z: number };
  boxPositions: { x: number; z: number }[];
  moveCount: number;
  currentLevel: number;
}

// 命令接口（命令模式）
export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
}

// 移动命令数据
export interface MoveCommandData {
  direction: Direction;
  playerPos: { x: number; z: number };
  boxPos?: { x: number; z: number };
  pushedBox: boolean;
}

// 游戏配置
export interface GameConfig {
  tileSize: number;
  wallHeight: number;
  boxSize: number;
  playerSize: number;
  targetSize: number;
  backgroundColor: number;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
}
