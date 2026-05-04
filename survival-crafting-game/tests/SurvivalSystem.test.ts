import { SurvivalSystem } from '../src/systems/SurvivalSystem';

describe('SurvivalSystem', () => {
  let survivalSystem: SurvivalSystem;

  beforeEach(() => {
    survivalSystem = new SurvivalSystem();
  });

  test('should initialize with full stats', () => {
    const stats = survivalSystem.getStats();
    expect(stats.hunger).toBe(100);
    expect(stats.thirst).toBe(100);
    expect(stats.health).toBe(100);
    expect(stats.isAlive).toBe(true);
  });

  test('should decay stats over time', () => {
    const initialStats = survivalSystem.getStats();
    
    // 模拟时间流逝
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 10000); // 10秒后
    
    survivalSystem.update();
    
    const updatedStats = survivalSystem.getStats();
    expect(updatedStats.hunger).toBeLessThan(initialStats.hunger);
    expect(updatedStats.thirst).toBeLessThan(initialStats.thirst);
    
    jest.useRealTimers();
  });

  test('should consume hunger when eating', () => {
    survivalSystem = new SurvivalSystem({ hungerDecayRate: 0 });
    survivalSystem.takeDamage(50);
    const initialStats = survivalSystem.getStats();
    
    survivalSystem.consumeHunger(20);
    
    const updatedStats = survivalSystem.getStats();
    expect(updatedStats.hunger).toBe(Math.min(100, initialStats.hunger + 20));
  });

  test('should consume thirst when drinking', () => {
    survivalSystem = new SurvivalSystem({ thirstDecayRate: 0 });
    const initialStats = survivalSystem.getStats();
    
    survivalSystem.consumeThirst(30);
    
    const updatedStats = survivalSystem.getStats();
    expect(updatedStats.thirst).toBe(Math.min(100, initialStats.thirst + 30));
  });

  test('should heal when healthy', () => {
    survivalSystem = new SurvivalSystem({ healthDecayRate: 0 });
    survivalSystem.takeDamage(30);
    const initialStats = survivalSystem.getStats();
    
    survivalSystem.heal(20);
    
    const updatedStats = survivalSystem.getStats();
    expect(updatedStats.health).toBe(initialStats.health + 20);
  });

  test('should take damage', () => {
    const initialStats = survivalSystem.getStats();
    
    survivalSystem.takeDamage(25);
    
    const updatedStats = survivalSystem.getStats();
    expect(updatedStats.health).toBe(initialStats.health - 25);
  });

  test('should die when health reaches zero', () => {
    survivalSystem.takeDamage(100);
    
    const stats = survivalSystem.getStats();
    expect(stats.health).toBe(0);
    expect(stats.isAlive).toBe(false);
  });

  test('should revive with full stats', () => {
    survivalSystem.takeDamage(100);
    expect(survivalSystem.getStats().isAlive).toBe(false);
    
    survivalSystem.revive();
    
    const stats = survivalSystem.getStats();
    expect(stats.isAlive).toBe(true);
    expect(stats.hunger).toBe(100);
    expect(stats.thirst).toBe(100);
    expect(stats.health).toBe(100);
  });

  test('should update config dynamically', () => {
    const initialConfig = survivalSystem.getConfig();
    
    survivalSystem.setConfig({ hungerDecayRate: 0.2 });
    
    const updatedConfig = survivalSystem.getConfig();
    expect(updatedConfig.hungerDecayRate).toBe(0.2);
    expect(updatedConfig.thirstDecayRate).toBe(initialConfig.thirstDecayRate);
  });

  test('should serialize and deserialize correctly', () => {
    survivalSystem.takeDamage(30);
    survivalSystem.setConfig({ hungerDecayRate: 0.15 });
    
    const serialized = survivalSystem.serialize();
    const newSystem = new SurvivalSystem();
    newSystem.deserialize(serialized);
    
    const originalStats = survivalSystem.getStats();
    const newStats = newSystem.getStats();
    
    expect(newStats.health).toBe(originalStats.health);
    expect(newStats.hunger).toBe(originalStats.hunger);
    expect(newStats.thirst).toBe(originalStats.thirst);
  });

  test('should return correct percentages', () => {
    survivalSystem.takeDamage(50);
    survivalSystem.consumeHunger(-30); // 测试边界情况
    
    expect(survivalSystem.getHealthPercentage()).toBe(50);
    expect(survivalSystem.getHungerPercentage()).toBeLessThanOrEqual(100);
    expect(survivalSystem.getThirstPercentage()).toBe(100);
  });
});
