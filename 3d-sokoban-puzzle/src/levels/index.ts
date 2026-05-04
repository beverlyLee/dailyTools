import { TileType, LevelData } from '../types';

// 教程关卡 - 简单演示基本操作
const tutorialLevel: LevelData = {
  name: '教程关卡',
  theme: 'forest',
  grid: [
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.PLAYER, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.BOX, TileType.TARGET, TileType.WALL],
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL]
  ]
};

// 关卡1 - 入门
const level1: LevelData = {
  name: '关卡 1: 入门',
  theme: 'forest',
  grid: [
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.PLAYER, TileType.BOX, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.TARGET, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL]
  ]
};

// 关卡2 - 进阶
const level2: LevelData = {
  name: '关卡 2: 进阶',
  theme: 'ice',
  grid: [
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.PLAYER, TileType.EMPTY, TileType.BOX, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.TARGET, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL]
  ]
};

// 关卡3 - 挑战
const level3: LevelData = {
  name: '关卡 3: 挑战',
  theme: 'desert',
  grid: [
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.PLAYER, TileType.EMPTY, TileType.BOX, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.TARGET, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.BOX, TileType.EMPTY, TileType.TARGET, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL]
  ]
};

// 关卡4 - 专家
const level4: LevelData = {
  name: '关卡 4: 专家',
  theme: 'space',
  grid: [
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.WALL, TileType.TARGET, TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.BOX, TileType.BOX, TileType.BOX, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.PLAYER, TileType.EMPTY, TileType.TARGET, TileType.EMPTY, TileType.TARGET, TileType.WALL],
    [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
    [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL]
  ]
};

// 所有关卡
export const levels: LevelData[] = [
  tutorialLevel,
  level1,
  level2,
  level3,
  level4
];

// 主题配置
export const themeConfig: Record<LevelData['theme'], {
  wallColor: number;
  floorColor: number;
  boxColor: number;
  playerColor: number;
  targetColor: number;
}> = {
  forest: {
    wallColor: 0x2e7d32,
    floorColor: 0x8d6e63,
    boxColor: 0x795548,
    playerColor: 0xff5722,
    targetColor: 0xffeb3b
  },
  ice: {
    wallColor: 0x4fc3f7,
    floorColor: 0xe3f2fd,
    boxColor: 0x2196f3,
    playerColor: 0xf44336,
    targetColor: 0xff9800
  },
  desert: {
    wallColor: 0x8d6e63,
    floorColor: 0xfff8e1,
    boxColor: 0x795548,
    playerColor: 0xe91e63,
    targetColor: 0x9c27b0
  },
  space: {
    wallColor: 0x37474f,
    floorColor: 0x263238,
    boxColor: 0x00bcd4,
    playerColor: 0xf44336,
    targetColor: 0x4caf50
  }
};
