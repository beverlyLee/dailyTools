/**
 * 对象池系统 (Object Pool System)
 * 
 * 对象池是一种性能优化设计模式，用于管理频繁创建和销毁的对象。
 * 在太空射击游戏中，子弹和敌机是高频创建和销毁的对象，使用对象池可以：
 * 1. 避免频繁的内存分配和释放，减少垃圾回收压力
 * 2. 提高游戏性能和帧率稳定性
 * 3. 简化对象生命周期管理
 * 
 * 工作原理：
 * - 预先创建一定数量的对象并存储在池中
 * - 当需要对象时，从池中获取而不是创建新的
 * - 当对象不再需要时，将其放回池中而不是销毁
 */
export class ObjectPool {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - Phaser场景实例
   * @param {string} objectType - 对象类型标识
   * @param {Function} createCallback - 创建对象的回调函数
   * @param {number} initialSize - 初始池大小
   */
  constructor(scene, objectType, createCallback, initialSize = 10) {
    this.scene = scene;
    this.objectType = objectType;
    this.createCallback = createCallback;
    
    // 存储可用的对象
    this.pool = [];
    // 存储正在使用的对象
    this.active = [];
    
    // 预先创建初始数量的对象
    this.grow(initialSize);
  }

  /**
   * 增加对象池的大小
   * @param {number} count - 要增加的对象数量
   */
  grow(count) {
    for (let i = 0; i < count; i++) {
      // 创建新对象并添加到池中
      const object = this.createCallback(this.scene);
      // 将对象标记为非活动状态
      if (object.setActive) object.setActive(false);
      if (object.setVisible) object.setVisible(false);
      this.pool.push(object);
    }
  }

  /**
   * 从对象池中获取一个对象
   * @param {number} x - 对象的X坐标
   * @param {number} y - 对象的Y坐标
   * @param {*} data - 传递给对象的额外数据
   * @returns {*} 激活的对象
   */
  get(x = 0, y = 0, data = null) {
    let object;
    
    if (this.pool.length > 0) {
      // 如果池中有可用对象，取出第一个
      object = this.pool.shift();
    } else {
      // 如果池中没有可用对象，创建新的（动态扩展）
      object = this.createCallback(this.scene);
    }
    
    // 激活对象
    if (object.setActive) object.setActive(true);
    if (object.setVisible) object.setVisible(true);
    
    // 设置对象位置
    if (object.setPosition) {
      object.setPosition(x, y);
    }
    
    // 调用对象的唤醒方法（如果有）
    if (object.wake) {
      object.wake(data);
    }
    
    // 添加到活动对象列表
    this.active.push(object);
    
    return object;
  }

  /**
   * 将对象放回对象池
   * @param {*} object - 要放回的对象
   */
  release(object) {
    // 从活动对象列表中移除
    const index = this.active.indexOf(object);
    if (index > -1) {
      this.active.splice(index, 1);
    }
    
    // 停用对象
    if (object.setActive) object.setActive(false);
    if (object.setVisible) object.setVisible(false);
    
    // 停止物理运动（如果有）
    if (object.body && object.body.velocity) {
      object.body.velocity.set(0, 0);
    }
    
    // 调用对象的休眠方法（如果有）
    if (object.sleep) {
      object.sleep();
    }
    
    // 将对象放回池中
    this.pool.push(object);
  }

  /**
   * 释放所有活动对象
   */
  releaseAll() {
    // 创建副本以避免在遍历过程中修改数组
    const activeCopy = [...this.active];
    activeCopy.forEach(object => this.release(object));
  }

  /**
   * 获取所有活动对象
   * @returns {Array} 活动对象数组
   */
  getActive() {
    return this.active;
  }

  /**
   * 获取可用对象数量
   * @returns {number} 可用对象数量
   */
  getPoolSize() {
    return this.pool.length;
  }

  /**
   * 获取活动对象数量
   * @returns {number} 活动对象数量
   */
  getActiveCount() {
    return this.active.length;
  }

  /**
   * 获取对象总数（可用 + 活动）
   * @returns {number} 对象总数
   */
  getTotalCount() {
    return this.pool.length + this.active.length;
  }

  /**
   * 销毁对象池
   */
  destroy() {
    // 释放所有活动对象
    this.releaseAll();
    
    // 销毁池中所有对象
    this.pool.forEach(object => {
      if (object.destroy) {
        object.destroy();
      }
    });
    
    // 清空数组
    this.pool = [];
    this.active = [];
  }
}

/**
 * 子弹对象池专用类
 * 专门为子弹对象优化的对象池
 */
export class BulletPool extends ObjectPool {
  constructor(scene, createCallback, initialSize = 20) {
    super(scene, 'bullet', createCallback, initialSize);
  }

  /**
   * 检查子弹是否超出屏幕边界，如果是则释放
   */
  checkBounds() {
    // 创建副本以避免在遍历过程中修改数组
    const activeCopy = [...this.active];
    
    activeCopy.forEach(bullet => {
      // 检查子弹是否超出屏幕
      if (bullet.y < -50 || bullet.y > this.scene.game.config.height + 50 ||
          bullet.x < -50 || bullet.x > this.scene.game.config.width + 50) {
        this.release(bullet);
      }
    });
  }
}

/**
 * 敌人对象池专用类
 * 专门为敌人对象优化的对象池
 */
export class EnemyPool extends ObjectPool {
  constructor(scene, createCallback, initialSize = 30) {
    super(scene, 'enemy', createCallback, initialSize);
  }

  /**
   * 检查敌人是否超出屏幕边界，如果是则释放
   */
  checkBounds() {
    // 创建副本以避免在遍历过程中修改数组
    const activeCopy = [...this.active];
    
    activeCopy.forEach(enemy => {
      // 检查敌人是否超出屏幕底部
      if (enemy.y > this.scene.game.config.height + 100) {
        this.release(enemy);
      }
    });
  }

  /**
   * 更新所有活动敌人
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    const activeCopy = [...this.active];
    
    activeCopy.forEach(enemy => {
      if (enemy.update) {
        enemy.update(time, delta);
      }
    });
  }
}
