import * as THREE from 'three';

export type FurnitureType =
  | 'sofa'
  | 'bookshelf'
  | 'cabinet'
  | 'table'
  | 'tv-stand'
  | 'cat-tree-large'
  | 'cat-tree-small'
  | 'cat-scratcher'
  | 'sisal-post'
  | 'litter-box'
  | 'dog-bed'
  | 'dog-bowl';

export type Category = 'furniture' | 'cat-facility' | 'dog-facility';

export type DogSize = 'small' | 'medium' | 'large';

export interface FurnitureDefinition {
  type: FurnitureType;
  name: string;
  category: Category;
  width: number;
  depth: number;
  height: number;
  color: number;
  isValuable?: boolean;
  isLeather?: boolean;
  isCatAccessible?: boolean;
  topHeight?: number;
  isFoodZone?: boolean;
  needsVentilation?: boolean;
}

export interface PlacedFurniture {
  id: string;
  type: FurnitureType;
  position: THREE.Vector3;
  rotation: number;
  mesh: THREE.Object3D;
  definition: FurnitureDefinition;
  boundingBox: THREE.Box3;
}

export interface AlertItem {
  level: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

export interface AnalysisResult {
  walkway: AlertItem[];
  catPath: AlertItem[];
  dogRest: AlertItem[];
  furnitureDamage: AlertItem[];
  cleaningPath: AlertItem[];
}

export interface WalkwayPath {
  start: THREE.Vector2;
  end: THREE.Vector2;
  width: number;
  isMain: boolean;
  name: string;
}

export interface RoomDefinition {
  width: number;
  depth: number;
  zones: RoomZone[];
  walkways: WalkwayPath[];
}

export interface RoomZone {
  type: 'living' | 'dining' | 'kitchen' | 'bedroom' | 'entry' | 'hallway';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

export interface CatPerchPoint {
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  source: string;
}

export interface CatPath {
  points: CatPerchPoint[];
  continuous: boolean;
  maxJumpGap: number;
}
