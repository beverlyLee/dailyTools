export const GAME_CONFIG = {
  width: 1280,
  height: 720,
  tileSize: 32,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  survival: {
    maxHunger: 100,
    maxThirst: 100,
    maxHealth: 100,
    hungerDecayRate: 0.05,
    thirstDecayRate: 0.1,
    healthDecayRate: 0.2,
    hungerRegenRate: 0.1,
    healthRegenRate: 0.05
  },
  inventory: {
    slots: 36,
    maxStackSize: 64
  },
  gathering: {
    treeHealth: 3,
    rockHealth: 5,
    gatheringTime: 1000
  },
  building: {
    gridSize: 32,
    maxPlacementDistance: 192
  },
  player: {
    speed: 200,
    maxCarryWeight: 100
  }
};

export const ITEM_TYPES = {
  wood: { name: '木材', icon: '🪵', stackable: true, weight: 1 },
  stone: { name: '石头', icon: '🪨', stackable: true, weight: 2 },
  apple: { name: '苹果', icon: '🍎', stackable: true, weight: 0.5, hunger: 10, thirst: 5 },
  water: { name: '水瓶', icon: '💧', stackable: true, weight: 1, thirst: 30 },
  cookedMeat: { name: '熟肉', icon: '🍖', stackable: true, weight: 1, hunger: 25 },
  plank: { name: '木板', icon: '📏', stackable: true, weight: 0.5 },
  stick: { name: '木棍', icon: '🪵', stackable: true, weight: 0.2 }
} as const;

export const BUILDING_TYPES = {
  campfire: { name: '营火', icon: '🔥', size: { width: 1, height: 1 }, cost: { wood: 5, stick: 2 } },
  woodWall: { name: '木墙', icon: '🧱', size: { width: 1, height: 1 }, cost: { wood: 10 } },
  stoneWall: { name: '石墙', icon: '🪨', size: { width: 1, height: 1 }, cost: { stone: 15 } },
  woodFloor: { name: '木地板', icon: '🪵', size: { width: 1, height: 1 }, cost: { plank: 4 } },
  chest: { name: '储物箱', icon: '📦', size: { width: 1, height: 1 }, cost: { wood: 20, stick: 5 } },
  bed: { name: '床', icon: '🛏️', size: { width: 2, height: 1 }, cost: { wood: 15, stick: 10 } }
} as const;

export const GATHERABLE_TYPES = {
  tree: { name: '树', icon: '🌲', drops: { wood: [3, 5], stick: [1, 3], apple: [0, 2] }, respawnTime: 30000 },
  rock: { name: '岩石', icon: '🪨', drops: { stone: [2, 4] }, respawnTime: 60000 },
  berryBush: { name: '浆果丛', icon: '🍇', drops: { apple: [2, 4] }, respawnTime: 45000 }
} as const;

export type ItemType = keyof typeof ITEM_TYPES;
export type BuildingType = keyof typeof BUILDING_TYPES;
export type GatherableType = keyof typeof GATHERABLE_TYPES;
