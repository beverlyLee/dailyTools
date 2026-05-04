import { GatheringSystem } from '../src/systems/GatheringSystem';
import { GatherableType, Position } from '../src/types';

describe('GatheringSystem', () => {
  let gatheringSystem: GatheringSystem;

  beforeEach(() => {
    gatheringSystem = new GatheringSystem();
  });

  test('should add gatherable correctly', () => {
    const position: Position = { x: 100, y: 100 };
    const id = gatheringSystem.addGatherable('tree' as GatherableType, position);

    expect(id).toBeDefined();

    const gatherable = gatheringSystem.getGatherable(id);
    expect(gatherable).not.toBeNull();
    expect(gatherable?.type).toBe('tree');
    expect(gatherable?.position.x).toBe(100);
    expect(gatherable?.position.y).toBe(100);
  });

  test('should get all gatherables', () => {
    gatheringSystem.addGatherable('tree' as GatherableType, { x: 100, y: 100 });
    gatheringSystem.addGatherable('rock' as GatherableType, { x: 200, y: 200 });
    gatheringSystem.addGatherable('berryBush' as GatherableType, { x: 300, y: 300 });

    const allGatherables = gatheringSystem.getAllGatherables();
    expect(allGatherables.length).toBe(3);
  });

  test('should gather resource and get drops', () => {
    const id = gatheringSystem.addGatherable('tree' as GatherableType, { x: 100, y: 100 });
    const gatherable = gatheringSystem.getGatherable(id);
    
    if (gatherable) {
      // 多次采集直到耗尽
      let drops = gatheringSystem.gather(id);
      while (drops && drops.length === 0) {
        drops = gatheringSystem.gather(id);
      }

      const depletedGatherable = gatheringSystem.getGatherable(id);
      expect(depletedGatherable?.isDepleted).toBe(true);
      expect(drops).not.toBeNull();
      expect(drops!.length).toBeGreaterThan(0);
    }
  });

  test('should calculate distance correctly', () => {
    const pos1: Position = { x: 0, y: 0 };
    const pos2: Position = { x: 3, y: 4 };

    const distance = gatheringSystem.getDistance(pos1, pos2);
    expect(distance).toBe(5);
  });

  test('should find nearby gatherables', () => {
    gatheringSystem.addGatherable('tree' as GatherableType, { x: 50, y: 50 });
    gatheringSystem.addGatherable('rock' as GatherableType, { x: 150, y: 150 });
    gatheringSystem.addGatherable('berryBush' as GatherableType, { x: 300, y: 300 });

    const nearby = gatheringSystem.findNearbyGatherables({ x: 100, y: 100 }, 100);
    
    expect(nearby.length).toBe(2);
    expect(nearby.some(g => g.type === 'tree')).toBe(true);
    expect(nearby.some(g => g.type === 'rock')).toBe(true);
    expect(nearby.some(g => g.type === 'berryBush')).toBe(false);
  });

  test('should respawn gatherable after time', () => {
    const id = gatheringSystem.addGatherable('tree' as GatherableType, { x: 100, y: 100 });
    
    // 采集直到耗尽
    let gatherable = gatheringSystem.getGatherable(id);
    while (gatherable && !gatherable.isDepleted) {
      gatheringSystem.gather(id);
      gatherable = gatheringSystem.getGatherable(id);
    }

    expect(gatherable?.isDepleted).toBe(true);

    // 更新时间超过重生时间
    gatheringSystem.update(100); // 100秒

    const respawnedGatherable = gatheringSystem.getGatherable(id);
    expect(respawnedGatherable?.isDepleted).toBe(false);
    expect(respawnedGatherable?.health).toBe(respawnedGatherable?.maxHealth);
  });

  test('should not find depleted gatherables nearby', () => {
    const id = gatheringSystem.addGatherable('tree' as GatherableType, { x: 100, y: 100 });
    
    // 采集直到耗尽
    let gatherable = gatheringSystem.getGatherable(id);
    while (gatherable && !gatherable.isDepleted) {
      gatheringSystem.gather(id);
      gatherable = gatheringSystem.getGatherable(id);
    }

    const nearby = gatheringSystem.findNearbyGatherables({ x: 100, y: 100 }, 100);
    expect(nearby.length).toBe(0);
  });

  test('should set and get gathering time', () => {
    expect(gatheringSystem.getGatheringTime()).toBe(1000);
    
    gatheringSystem.setGatheringTime(2000);
    expect(gatheringSystem.getGatheringTime()).toBe(2000);
  });

  test('should serialize and deserialize correctly', () => {
    gatheringSystem.addGatherable('tree' as GatherableType, { x: 100, y: 100 });
    gatheringSystem.addGatherable('rock' as GatherableType, { x: 200, y: 200 });
    gatheringSystem.setGatheringTime(1500);

    const serialized = gatheringSystem.serialize();
    const newSystem = new GatheringSystem();
    newSystem.deserialize(serialized);

    const allGatherables = newSystem.getAllGatherables();
    expect(allGatherables.length).toBe(2);
    expect(newSystem.getGatheringTime()).toBe(1500);
  });

  test('should return null when gathering non-existent gatherable', () => {
    const result = gatheringSystem.gather('non_existent_id');
    expect(result).toBeNull();
  });
});
