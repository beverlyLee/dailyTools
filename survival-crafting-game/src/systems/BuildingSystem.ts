import { Building, BuildingType, GridPosition, Position, Serializable } from '../types';
import { BUILDING_TYPES, GAME_CONFIG, ItemType } from '../config';
import { InventorySystem } from './InventorySystem';

export class BuildingSystem implements Serializable {
  private buildings: Building[];
  private gridSize: number;
  private maxPlacementDistance: number;

  constructor() {
    this.buildings = [];
    this.gridSize = GAME_CONFIG.building.gridSize;
    this.maxPlacementDistance = GAME_CONFIG.building.maxPlacementDistance;
  }

  getGridPosition(worldPosition: Position): GridPosition {
    return {
      gridX: Math.floor(worldPosition.x / this.gridSize),
      gridY: Math.floor(worldPosition.y / this.gridSize)
    };
  }

  getWorldPosition(gridPosition: GridPosition): Position {
    return {
      x: gridPosition.gridX * this.gridSize + this.gridSize / 2,
      y: gridPosition.gridY * this.gridSize + this.gridSize / 2
    };
  }

  canPlace(type: BuildingType, gridPosition: GridPosition, playerPosition: Position, inventory: InventorySystem): boolean {
    const buildingType = BUILDING_TYPES[type];
    
    if (!this.isWithinPlacementDistance(gridPosition, playerPosition)) {
      return false;
    }

    if (!this.isAreaEmpty(gridPosition, buildingType.size.width, buildingType.size.height)) {
      return false;
    }

    if (!inventory.hasItems(buildingType.cost as Partial<Record<ItemType, number>>)) {
      return false;
    }

    return true;
  }

  placeBuilding(type: BuildingType, gridPosition: GridPosition, playerPosition: Position, inventory: InventorySystem): Building | null {
    if (!this.canPlace(type, gridPosition, playerPosition, inventory)) {
      return null;
    }

    const buildingType = BUILDING_TYPES[type];

    if (!inventory.removeItems(buildingType.cost as Partial<Record<ItemType, number>>)) {
      return null;
    }

    const building: Building = {
      id: this.generateId(),
      type,
      position: { ...gridPosition },
      health: 100,
      maxHealth: 100
    };

    this.buildings.push(building);
    return building;
  }

  removeBuilding(id: string): boolean {
    const index = this.buildings.findIndex(b => b.id === id);
    if (index === -1) return false;

    this.buildings.splice(index, 1);
    return true;
  }

  getBuilding(id: string): Building | null {
    return this.buildings.find(b => b.id === id) || null;
  }

  getAllBuildings(): Building[] {
    return this.buildings.map(b => ({ ...b, position: { ...b.position } }));
  }

  getBuildingAt(gridPosition: GridPosition): Building | null {
    for (const building of this.buildings) {
      const buildingType = BUILDING_TYPES[building.type];
      const { width, height } = buildingType.size;

      if (
        gridPosition.gridX >= building.position.gridX &&
        gridPosition.gridX < building.position.gridX + width &&
        gridPosition.gridY >= building.position.gridY &&
        gridPosition.gridY < building.position.gridY + height
      ) {
        return building;
      }
    }
    return null;
  }

  isAreaEmpty(startGridPosition: GridPosition, width: number, height: number): boolean {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const checkPosition = {
          gridX: startGridPosition.gridX + x,
          gridY: startGridPosition.gridY + y
        };
        if (this.getBuildingAt(checkPosition)) {
          return false;
        }
      }
    }
    return true;
  }

  isWithinPlacementDistance(gridPosition: GridPosition, playerPosition: Position): boolean {
    const buildingWorldPosition = this.getWorldPosition(gridPosition);
    const dx = buildingWorldPosition.x - playerPosition.x;
    const dy = buildingWorldPosition.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.maxPlacementDistance;
  }

  damageBuilding(id: string, damage: number): boolean {
    const building = this.getBuilding(id);
    if (!building) return false;

    building.health = Math.max(0, building.health - damage);

    if (building.health <= 0) {
      this.removeBuilding(id);
    }

    return true;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  setGridSize(size: number): void {
    this.gridSize = size;
  }

  getMaxPlacementDistance(): number {
    return this.maxPlacementDistance;
  }

  setMaxPlacementDistance(distance: number): void {
    this.maxPlacementDistance = distance;
  }

  private generateId(): string {
    return `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  serialize(): string {
    return JSON.stringify({
      buildings: this.buildings.map(b => ({ ...b, position: { ...b.position } })),
      gridSize: this.gridSize,
      maxPlacementDistance: this.maxPlacementDistance
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.buildings = parsed.buildings || [];
      this.gridSize = parsed.gridSize || GAME_CONFIG.building.gridSize;
      this.maxPlacementDistance = parsed.maxPlacementDistance || GAME_CONFIG.building.maxPlacementDistance;
    } catch (error) {
      console.error('Failed to deserialize BuildingSystem:', error);
    }
  }
}
