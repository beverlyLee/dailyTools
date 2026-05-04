import { BuildingSystem } from '../src/systems/BuildingSystem';
import { InventorySystem } from '../src/systems/InventorySystem';
import { Position, BuildingType } from '../src/types';

describe('BuildingSystem', () => {
  let buildingSystem: BuildingSystem;
  let inventorySystem: InventorySystem;

  beforeEach(() => {
    buildingSystem = new BuildingSystem();
    inventorySystem = new InventorySystem();
  });

  test('should convert between world and grid positions', () => {
    const worldPosition: Position = { x: 50, y: 50 };
    const gridPosition = buildingSystem.getGridPosition(worldPosition);
    
    expect(gridPosition.gridX).toBe(1);
    expect(gridPosition.gridY).toBe(1);

    const convertedWorldPosition = buildingSystem.getWorldPosition(gridPosition);
    expect(convertedWorldPosition.x).toBe(48);
    expect(convertedWorldPosition.y).toBe(48);
  });

  test('should check if position is empty', () => {
    const isEmpty = buildingSystem.isAreaEmpty({ gridX: 0, gridY: 0 }, 1, 1);
    expect(isEmpty).toBe(true);
  });

  test('should check within placement distance', () => {
    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 0, y: 0 };
    
    const isWithin = buildingSystem.isWithinPlacementDistance(gridPosition, playerPosition);
    expect(isWithin).toBe(true);

    const farPosition: Position = { x: 1000, y: 1000 };
    const isFar = buildingSystem.isWithinPlacementDistance(gridPosition, farPosition);
    expect(isFar).toBe(false);
  });

  test('should not place building without required resources', () => {
    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    // 背包没有足够的木材
    const result = buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(result).toBeNull();
  });

  test('should place building with required resources', () => {
    // 先添加足够的资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 10
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 5
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    const result = buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(result).not.toBeNull();
    expect(result?.type).toBe('campfire');
  });

  test('should not place building on occupied position', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 20
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 10
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    // 放置第一个建筑
    buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    // 再次尝试在同一位置放置
    const result = buildingSystem.placeBuilding(
      'woodWall' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(result).toBeNull();
  });

  test('should remove building', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 10
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 5
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    const building = buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(building).not.toBeNull();

    const result = buildingSystem.removeBuilding(building!.id);
    expect(result).toBe(true);

    const foundBuilding = buildingSystem.getBuilding(building!.id);
    expect(foundBuilding).toBeNull();
  });

  test('should get building at position', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 10
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 5
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    const foundBuilding = buildingSystem.getBuildingAt(gridPosition);
    expect(foundBuilding).not.toBeNull();
    expect(foundBuilding?.type).toBe('campfire');
  });

  test('should damage building', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 10
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 5
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    const building = buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(building).not.toBeNull();

    const initialHealth = building!.health;
    buildingSystem.damageBuilding(building!.id, 30);

    const damagedBuilding = buildingSystem.getBuilding(building!.id);
    expect(damagedBuilding?.health).toBe(initialHealth - 30);
  });

  test('should destroy building when health reaches zero', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 10
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 5
    });

    const gridPosition = { gridX: 0, gridY: 0 };
    const playerPosition: Position = { x: 50, y: 50 };

    const building = buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      gridPosition,
      playerPosition,
      inventorySystem
    );

    expect(building).not.toBeNull();

    buildingSystem.damageBuilding(building!.id, 200);

    const destroyedBuilding = buildingSystem.getBuilding(building!.id);
    expect(destroyedBuilding).toBeNull();
  });

  test('should set and get grid size', () => {
    expect(buildingSystem.getGridSize()).toBe(32);
    
    buildingSystem.setGridSize(64);
    expect(buildingSystem.getGridSize()).toBe(64);
  });

  test('should set and get max placement distance', () => {
    expect(buildingSystem.getMaxPlacementDistance()).toBe(192);
    
    buildingSystem.setMaxPlacementDistance(300);
    expect(buildingSystem.getMaxPlacementDistance()).toBe(300);
  });

  test('should serialize and deserialize correctly', () => {
    // 先添加资源
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as any,
      quantity: 20
    });
    inventorySystem.addItem({
      id: 'test_2',
      type: 'stick' as any,
      quantity: 10
    });

    const playerPosition: Position = { x: 50, y: 50 };

    // 放置多个建筑
    buildingSystem.placeBuilding(
      'campfire' as BuildingType,
      { gridX: 0, gridY: 0 },
      playerPosition,
      inventorySystem
    );

    buildingSystem.placeBuilding(
      'woodWall' as BuildingType,
      { gridX: 1, gridY: 0 },
      playerPosition,
      inventorySystem
    );

    buildingSystem.setGridSize(64);
    buildingSystem.setMaxPlacementDistance(300);

    const serialized = buildingSystem.serialize();
    const newSystem = new BuildingSystem();
    newSystem.deserialize(serialized);

    const allBuildings = newSystem.getAllBuildings();
    expect(allBuildings.length).toBe(2);
    expect(newSystem.getGridSize()).toBe(64);
    expect(newSystem.getMaxPlacementDistance()).toBe(300);
  });

  test('should return false when removing non-existent building', () => {
    const result = buildingSystem.removeBuilding('non_existent_id');
    expect(result).toBe(false);
  });

  test('should return false when damaging non-existent building', () => {
    const result = buildingSystem.damageBuilding('non_existent_id', 50);
    expect(result).toBe(false);
  });

  test('should return null when getting non-existent building', () => {
    const result = buildingSystem.getBuilding('non_existent_id');
    expect(result).toBeNull();
  });
});
