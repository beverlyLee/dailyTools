/**
 * 波次系统测试
 * 测试WaveSystem和WaveManager类的功能
 */

import { WaveSystem, WaveManager, WaveData } from '../src/systems/WaveSystem.js';
import { EnemyBehavior } from '../src/config.js';

// 模拟Phaser场景
class MockScene {
  constructor() {
    this.time = {
      delayedCall: (delay, callback) => {
        setTimeout(callback, delay);
      },
      now: 0
    };
    this.game = {
      config: {
        width: 800,
        height: 600
      }
    };
  }
}

describe('WaveData', () => {
  test('should have level1 wave data', () => {
    expect(WaveData.level1).toBeDefined();
    expect(Array.isArray(WaveData.level1)).toBe(true);
    expect(WaveData.level1.length).toBeGreaterThan(0);
  });
  
  test('should have level2 wave data', () => {
    expect(WaveData.level2).toBeDefined();
    expect(Array.isArray(WaveData.level2)).toBe(true);
    expect(WaveData.level2.length).toBeGreaterThan(0);
  });
  
  test('should have correct wave structure', () => {
    const wave = WaveData.level1[0];
    
    expect(wave.waveNumber).toBeDefined();
    expect(wave.name).toBeDefined();
    expect(wave.enemies).toBeDefined();
    expect(Array.isArray(wave.enemies)).toBe(true);
  });
  
  test('should have correct enemy structure', () => {
    const enemy = WaveData.level1[0].enemies[0];
    
    expect(enemy.type).toBeDefined();
    expect(enemy.count).toBeDefined();
    expect(enemy.behavior).toBeDefined();
    expect(enemy.delay).toBeDefined();
  });
});

describe('WaveSystem', () => {
  let scene;
  let spawnCallback;
  
  beforeEach(() => {
    scene = new MockScene();
    spawnCallback = jest.fn((x, y, type, behavior, canAttack, formationX) => ({
      x, y, type, behavior, canAttack, formationX,
      health: 1,
      takeDamage: jest.fn()
    }));
  });
  
  test('should create wave system', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    
    expect(waveSystem).toBeDefined();
    expect(waveSystem.isPlaying).toBe(false);
    expect(waveSystem.isPaused).toBe(false);
  });
  
  test('should set callbacks', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    const onWaveStart = jest.fn();
    const onWaveComplete = jest.fn();
    const onLevelComplete = jest.fn();
    const onEnemySpawn = jest.fn();
    
    waveSystem.onWaveStart = onWaveStart;
    waveSystem.onWaveComplete = onWaveComplete;
    waveSystem.onLevelComplete = onLevelComplete;
    waveSystem.onEnemySpawn = onEnemySpawn;
    
    expect(waveSystem.onWaveStart).toBe(onWaveStart);
    expect(waveSystem.onWaveComplete).toBe(onWaveComplete);
    expect(waveSystem.onLevelComplete).toBe(onLevelComplete);
    expect(waveSystem.onEnemySpawn).toBe(onEnemySpawn);
  });
  
  test('should get current wave info', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    
    const info = waveSystem.getCurrentWaveInfo();
    
    expect(info.level).toBe(1);
    expect(info.waveIndex).toBe(0);
    expect(info.isPlaying).toBe(false);
    expect(info.isPaused).toBe(false);
  });
  
  test('should start wave system', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    
    waveSystem.start(1);
    
    expect(waveSystem.isPlaying).toBe(true);
    expect(waveSystem.currentLevel).toBe(1);
  });
  
  test('should pause and resume wave system', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    waveSystem.start(1);
    
    expect(waveSystem.isPaused).toBe(false);
    
    waveSystem.pause();
    expect(waveSystem.isPaused).toBe(true);
    
    waveSystem.resume();
    expect(waveSystem.isPaused).toBe(false);
  });
  
  test('should stop wave system', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    waveSystem.start(1);
    
    expect(waveSystem.isPlaying).toBe(true);
    
    waveSystem.stop();
    
    expect(waveSystem.isPlaying).toBe(false);
    expect(waveSystem.isPaused).toBe(false);
  });
  
  test('should notify when enemy is destroyed', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    
    // 模拟波次开始
    waveSystem.start(1);
    waveSystem.enemiesRemaining = 5;
    
    waveSystem.enemyDestroyed();
    
    expect(waveSystem.enemiesRemaining).toBe(4);
  });
  
  test('should destroy wave system', () => {
    const waveSystem = new WaveSystem(scene, spawnCallback);
    const onWaveStart = jest.fn();
    waveSystem.onWaveStart = onWaveStart;
    
    waveSystem.destroy();
    
    expect(waveSystem.spawnEnemyCallback).toBeNull();
    expect(waveSystem.onWaveStart).toBeNull();
    expect(waveSystem.currentWaveData).toBeNull();
  });
});

describe('WaveManager', () => {
  let scene;
  let spawnCallback;
  
  beforeEach(() => {
    scene = new MockScene();
    spawnCallback = jest.fn();
  });
  
  test('should create wave manager', () => {
    const waveManager = new WaveManager(scene);
    
    expect(waveManager).toBeDefined();
    expect(waveManager.waveSystems.size).toBe(0);
  });
  
  test('should create wave system', () => {
    const waveManager = new WaveManager(scene);
    
    const waveSystem = waveManager.createWaveSystem('main', spawnCallback);
    
    expect(waveSystem).toBeDefined();
    expect(waveManager.waveSystems.size).toBe(1);
    expect(waveManager.getWaveSystem('main')).toBe(waveSystem);
  });
  
  test('should get existing wave system', () => {
    const waveManager = new WaveManager(scene);
    const waveSystem = waveManager.createWaveSystem('main', spawnCallback);
    
    const retrieved = waveManager.getWaveSystem('main');
    
    expect(retrieved).toBe(waveSystem);
  });
  
  test('should return null for non-existent wave system', () => {
    const waveManager = new WaveManager(scene);
    
    const retrieved = waveManager.getWaveSystem('nonExistent');
    
    expect(retrieved).toBeUndefined();
  });
  
  test('should set active wave system', () => {
    const waveManager = new WaveManager(scene);
    const waveSystem1 = waveManager.createWaveSystem('main', spawnCallback);
    const waveSystem2 = waveManager.createWaveSystem('bonus', spawnCallback);
    
    waveManager.setActiveWaveSystem('main');
    
    expect(waveManager.activeWaveSystem).toBe(waveSystem1);
  });
  
  test('should update all wave systems', () => {
    const waveManager = new WaveManager(scene);
    const waveSystem1 = waveManager.createWaveSystem('main', spawnCallback);
    const waveSystem2 = waveManager.createWaveSystem('bonus', spawnCallback);
    
    // Mock update methods
    waveSystem1.update = jest.fn();
    waveSystem2.update = jest.fn();
    
    waveManager.update(1000, 16);
    
    expect(waveSystem1.update).toHaveBeenCalledWith(1000, 16);
    expect(waveSystem2.update).toHaveBeenCalledWith(1000, 16);
  });
  
  test('should destroy all wave systems', () => {
    const waveManager = new WaveManager(scene);
    const waveSystem1 = waveManager.createWaveSystem('main', spawnCallback);
    const waveSystem2 = waveManager.createWaveSystem('bonus', spawnCallback);
    
    // Mock destroy methods
    waveSystem1.destroy = jest.fn();
    waveSystem2.destroy = jest.fn();
    
    waveManager.destroy();
    
    expect(waveSystem1.destroy).toHaveBeenCalled();
    expect(waveSystem2.destroy).toHaveBeenCalled();
    expect(waveManager.waveSystems.size).toBe(0);
    expect(waveManager.activeWaveSystem).toBeNull();
  });
});
