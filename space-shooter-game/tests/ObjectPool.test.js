/**
 * 对象池系统测试
 * 测试ObjectPool、BulletPool和EnemyPool类的功能
 */

import { ObjectPool, BulletPool, EnemyPool } from '../src/systems/ObjectPool.js';

// 模拟Phaser场景
class MockScene {
  constructor() {
    this.time = {
      delayedCall: (delay, callback) => {
        setTimeout(callback, delay);
      }
    };
    this.game = {
      config: {
        width: 800,
        height: 600
      }
    };
  }
}

// 模拟游戏对象
class MockGameObject {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.body = {
      velocity: { x: 0, y: 0 },
      set: (x, y) => { this.body.velocity.x = x; this.body.velocity.y = y; }
    };
  }
  
  setActive(active) { this.active = active; }
  setVisible(visible) { this.visible = visible; }
  setPosition(x, y) { this.x = x; this.y = y; }
  setVelocity(x, y) { 
    if (this.body) {
      this.body.velocity.x = x;
      this.body.velocity.y = y;
    }
  }
  setVelocityX(x) { if (this.body) this.body.velocity.x = x; }
  setVelocityY(y) { if (this.body) this.body.velocity.y = y; }
  setAlpha(alpha) { this.alpha = alpha; }
  destroy() { this.destroyed = true; }
}

describe('ObjectPool', () => {
  let scene;
  let createCallback;
  
  beforeEach(() => {
    scene = new MockScene();
    createCallback = jest.fn((s) => new MockGameObject(s));
  });
  
  test('should create pool with initial size', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 5);
    
    expect(createCallback).toHaveBeenCalledTimes(5);
    expect(pool.getPoolSize()).toBe(5);
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getTotalCount()).toBe(5);
  });
  
  test('should get object from pool', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 3);
    const initialPoolSize = pool.getPoolSize();
    
    const obj = pool.get(100, 200);
    
    expect(obj).toBeDefined();
    expect(obj.active).toBe(true);
    expect(obj.visible).toBe(true);
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(200);
    expect(pool.getPoolSize()).toBe(initialPoolSize - 1);
    expect(pool.getActiveCount()).toBe(1);
  });
  
  test('should release object back to pool', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 3);
    const obj = pool.get(100, 200);
    const initialActiveCount = pool.getActiveCount();
    const initialPoolSize = pool.getPoolSize();
    
    pool.release(obj);
    
    expect(obj.active).toBe(false);
    expect(obj.visible).toBe(false);
    expect(pool.getActiveCount()).toBe(initialActiveCount - 1);
    expect(pool.getPoolSize()).toBe(initialPoolSize + 1);
  });
  
  test('should create new object when pool is empty', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 1);
    
    // 获取唯一的对象
    const obj1 = pool.get(100, 200);
    expect(createCallback).toHaveBeenCalledTimes(1);
    
    // 再次获取，应该创建新对象
    const obj2 = pool.get(200, 300);
    expect(createCallback).toHaveBeenCalledTimes(2);
    expect(pool.getTotalCount()).toBe(2);
  });
  
  test('should release all active objects', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 5);
    
    // 获取3个对象
    pool.get(100, 200);
    pool.get(200, 300);
    pool.get(300, 400);
    
    expect(pool.getActiveCount()).toBe(3);
    expect(pool.getPoolSize()).toBe(2);
    
    // 释放所有活动对象
    pool.releaseAll();
    
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getPoolSize()).toBe(5);
  });
  
  test('should grow pool size', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 2);
    expect(pool.getTotalCount()).toBe(2);
    
    pool.grow(3);
    
    expect(pool.getTotalCount()).toBe(5);
    expect(createCallback).toHaveBeenCalledTimes(5);
  });
  
  test('should destroy pool', () => {
    const pool = new ObjectPool(scene, 'test', createCallback, 3);
    const obj = pool.get(100, 200);
    
    pool.destroy();
    
    expect(pool.getPoolSize()).toBe(0);
    expect(pool.getActiveCount()).toBe(0);
  });
});

describe('BulletPool', () => {
  let scene;
  let createCallback;
  
  beforeEach(() => {
    scene = new MockScene();
    createCallback = jest.fn((s) => {
      const obj = new MockGameObject(s);
      return obj;
    });
  });
  
  test('should create bullet pool with default size', () => {
    const pool = new BulletPool(scene, createCallback);
    
    expect(pool.getPoolSize()).toBe(20); // 默认大小
  });
  
  test('should check bounds and release out of bounds bullets', () => {
    const pool = new BulletPool(scene, createCallback, 3);
    
    // 创建一个在屏幕内的子弹
    const bullet1 = pool.get(400, 300);
    bullet1.x = 400;
    bullet1.y = 300;
    
    // 创建一个超出屏幕顶部的子弹
    const bullet2 = pool.get(400, -100);
    bullet2.x = 400;
    bullet2.y = -100;
    
    // 创建一个超出屏幕底部的子弹
    const bullet3 = pool.get(400, 700);
    bullet3.x = 400;
    bullet3.y = 700;
    
    const initialActiveCount = pool.getActiveCount();
    expect(initialActiveCount).toBe(3);
    
    pool.checkBounds();
    
    // 只有超出边界的子弹应该被释放
    expect(pool.getActiveCount()).toBe(1);
    expect(bullet1.active).toBe(true);
    expect(bullet2.active).toBe(false);
    expect(bullet3.active).toBe(false);
  });
});

describe('EnemyPool', () => {
  let scene;
  let createCallback;
  
  beforeEach(() => {
    scene = new MockScene();
    createCallback = jest.fn((s) => {
      const obj = new MockGameObject(s);
      obj.update = jest.fn();
      return obj;
    });
  });
  
  test('should create enemy pool with default size', () => {
    const pool = new EnemyPool(scene, createCallback);
    
    expect(pool.getPoolSize()).toBe(30); // 默认大小
  });
  
  test('should update all active enemies', () => {
    const pool = new EnemyPool(scene, createCallback, 3);
    
    // 获取2个敌人
    const enemy1 = pool.get(100, 200);
    const enemy2 = pool.get(200, 300);
    
    // 重置mock
    enemy1.update.mockClear();
    enemy2.update.mockClear();
    
    // 更新
    pool.update(1000, 16);
    
    expect(enemy1.update).toHaveBeenCalledWith(1000, 16);
    expect(enemy2.update).toHaveBeenCalledWith(1000, 16);
  });
  
  test('should check bounds and release out of bounds enemies', () => {
    const pool = new EnemyPool(scene, createCallback, 3);
    
    // 创建一个在屏幕内的敌人
    const enemy1 = pool.get(400, 300);
    enemy1.x = 400;
    enemy1.y = 300;
    
    // 创建一个超出屏幕底部的敌人
    const enemy2 = pool.get(400, 800);
    enemy2.x = 400;
    enemy2.y = 800;
    
    const initialActiveCount = pool.getActiveCount();
    expect(initialActiveCount).toBe(2);
    
    pool.checkBounds();
    
    // 只有超出底部边界的敌人应该被释放
    expect(pool.getActiveCount()).toBe(1);
    expect(enemy1.active).toBe(true);
    expect(enemy2.active).toBe(false);
  });
});
