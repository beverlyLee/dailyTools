import { ItemType, BuildingType, GatherableType } from '../config';

export interface Item {
  id: string;
  type: ItemType;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export interface InventorySlot {
  index: number;
  item: Item | null;
}

export interface Inventory {
  slots: InventorySlot[];
  maxSlots: number;
  maxStackSize: number;
}

export interface SurvivalStats {
  hunger: number;
  thirst: number;
  health: number;
  maxHunger: number;
  maxThirst: number;
  maxHealth: number;
  isAlive: boolean;
}

export interface SurvivalConfig {
  hungerDecayRate: number;
  thirstDecayRate: number;
  healthDecayRate: number;
  hungerRegenRate: number;
  healthRegenRate: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  gridX: number;
  gridY: number;
}

export interface Gatherable {
  id: string;
  type: GatherableType;
  position: Position;
  health: number;
  maxHealth: number;
  isDepleted: boolean;
  respawnTimer: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: GridPosition;
  health: number;
  maxHealth: number;
}

export interface PlayerState {
  position: Position;
  velocity: Position;
  inventory: Inventory;
  survival: SurvivalStats;
  selectedBuildingType: BuildingType | null;
  isGathering: boolean;
  gatheringProgress: number;
  gatheringTarget: string | null;
}

export interface GameState {
  player: PlayerState;
  gatherables: Gatherable[];
  buildings: Building[];
  time: number;
  dayTime: number;
  isPaused: boolean;
}

export interface Serializable {
  serialize(): string;
  deserialize(data: string): void;
}

export interface ItemDrop {
  itemType: ItemType;
  minQuantity: number;
  maxQuantity: number;
}

export interface BuildingCost {
  itemType: ItemType;
  quantity: number;
}

export interface GameEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type InventoryOperation = 
  | { type: 'ADD'; item: Item }
  | { type: 'REMOVE'; index: number; quantity: number }
  | { type: 'SWAP'; index1: number; index2: number }
  | { type: 'SPLIT'; index: number; splitQuantity: number }
  | { type: 'MERGE'; index1: number; index2: number };

export interface GameStateSnapshot {
  player: {
    position: Position;
    inventory: {
      slots: { index: number; item: Item | null }[];
    };
    survival: SurvivalStats;
  };
  gatherables: Gatherable[];
  buildings: Building[];
  time: number;
}
