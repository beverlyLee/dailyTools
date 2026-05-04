import { EnemyBehavior, GameConfig } from '../config.js';

/**
 * 波次系统 (Wave System)
 * 
 * 波次系统负责管理关卡中敌机的生成，包括：
 * - 定义不同波次的敌人配置
 * - 控制敌人生成的时机和频率
 * - 支持编队生成
 * - 可以保存和读取波次数据到LocalStorage
 * 
 * 工作原理：
 * - 每个波次包含多个敌人组
 * - 每个敌人组定义要生成的敌人类型、数量和行为
 * - 系统按照配置的顺序和时间间隔生成敌人
 */

/**
 * 波次数据定义
 * 包含所有关卡的波次配置
 */
export const WaveData = {
  // 第1关：基础敌人
  level1: [
    {
      waveNumber: 1,
      name: "基础攻击",
      enemies: [
        {
          type: 'BASIC',
          count: 5,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 1000,
          canAttack: false
        }
      ]
    },
    {
      waveNumber: 2,
      name: "更多敌人",
      enemies: [
        {
          type: 'BASIC',
          count: 8,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 800,
          canAttack: false
        }
      ]
    },
    {
      waveNumber: 3,
      name: "快速敌人",
      enemies: [
        {
          type: 'FAST',
          count: 5,
          behavior: EnemyBehavior.CURVE,
          delay: 1000,
          canAttack: false
        }
      ]
    },
    {
      waveNumber: 4,
      name: "混合攻击",
      enemies: [
        {
          type: 'BASIC',
          count: 4,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 1200,
          canAttack: false
        },
        {
          type: 'FAST',
          count: 3,
          behavior: EnemyBehavior.CURVE,
          delay: 1200,
          canAttack: false
        }
      ]
    },
    {
      waveNumber: 5,
      name: "重型敌人",
      enemies: [
        {
          type: 'HEAVY',
          count: 3,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 1500,
          canAttack: true
        }
      ]
    }
  ],
  
  // 第2关：增加难度
  level2: [
    {
      waveNumber: 1,
      name: "编队攻击",
      enemies: [
        {
          type: 'FORMATION',
          count: 6,
          behavior: EnemyBehavior.FORMATION,
          delay: 500,
          canAttack: false,
          formation: true
        }
      ]
    },
    {
      waveNumber: 2,
      name: "Z字形攻击",
      enemies: [
        {
          type: 'FAST',
          count: 6,
          behavior: EnemyBehavior.ZIGZAG,
          delay: 800,
          canAttack: false
        }
      ]
    },
    {
      waveNumber: 3,
      name: "混合编队",
      enemies: [
        {
          type: 'FORMATION',
          count: 4,
          behavior: EnemyBehavior.FORMATION,
          delay: 600,
          canAttack: false,
          formation: true
        },
        {
          type: 'HEAVY',
          count: 2,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 2000,
          canAttack: true
        }
      ]
    },
    {
      waveNumber: 4,
      name: "全方位攻击",
      enemies: [
        {
          type: 'BASIC',
          count: 4,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 1000,
          canAttack: false
        },
        {
          type: 'FAST',
          count: 4,
          behavior: EnemyBehavior.CURVE,
          delay: 1000,
          canAttack: false
        },
        {
          type: 'FORMATION',
          count: 4,
          behavior: EnemyBehavior.FORMATION,
          delay: 1000,
          canAttack: false,
          formation: true
        }
      ]
    },
    {
      waveNumber: 5,
      name: "BOSS波次",
      enemies: [
        {
          type: 'HEAVY',
          count: 5,
          behavior: EnemyBehavior.STRAIGHT,
          delay: 1500,
          canAttack: true
        }
      ]
    }
  ]
};

/**
 * 波次系统类
 * 管理波次的执行和敌人生成
 */
export class WaveSystem {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - Phaser场景实例
   * @param {Function} spawnEnemyCallback - 生成敌人的回调函数
   */
  constructor(scene, spawnEnemyCallback) {
    this.scene = scene;
    this.spawnEnemyCallback = spawnEnemyCallback;
    
    // 当前波次状态
    this.currentLevel = 1;
    this.currentWaveIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // 波次计时器
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    
    // 当前波次数据
    this.currentWaveData = null;
    this.currentEnemyGroupIndex = 0;
    this.currentEnemyIndex = 0;
    this.enemiesRemaining = 0;
    
    // 波次配置
    this.waveDelay = GameConfig.WAVES.WAVE_DELAY;
    
    // 回调函数
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onLevelComplete = null;
    this.onEnemySpawn = null;
    
    // 加载保存的波次数据
    this.loadWaveData();
  }

  /**
   * 开始波次系统
   * @param {number} level - 关卡编号
   */
  start(level = 1) {
    this.currentLevel = level;
    this.currentWaveIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    
    // 获取关卡波次数据
    const levelKey = `level${level}`;
    if (!WaveData[levelKey]) {
      console.warn(`关卡 ${level} 不存在，使用关卡1`);
      this.currentLevel = 1;
    }
    
    // 开始第一个波次
    this.startNextWave();
  }

  /**
   * 暂停波次系统
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * 恢复波次系统
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * 停止波次系统
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    this.currentWaveData = null;
  }

  /**
   * 开始下一个波次
   */
  startNextWave() {
    const levelKey = `level${this.currentLevel}`;
    const levelWaves = WaveData[levelKey];
    
    if (!levelWaves || this.currentWaveIndex >= levelWaves.length) {
      // 关卡完成
      this.isPlaying = false;
      if (this.onLevelComplete) {
        this.onLevelComplete(this.currentLevel);
      }
      return;
    }
    
    // 获取当前波次数据
    this.currentWaveData = levelWaves[this.currentWaveIndex];
    this.currentEnemyGroupIndex = 0;
    this.currentEnemyIndex = 0;
    this.enemySpawnTimer = 0;
    
    // 计算剩余敌人数
    this.enemiesRemaining = this.currentWaveData.enemies.reduce((sum, group) => sum + group.count, 0);
    
    // 触发波次开始回调
    if (this.onWaveStart) {
      this.onWaveStart(this.currentWaveData, this.currentWaveIndex);
    }
    
    console.log(`开始波次 ${this.currentWaveData.waveNumber}: ${this.currentWaveData.name}`);
  }

  /**
   * 更新波次系统
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    if (!this.isPlaying || this.isPaused || !this.currentWaveData) {
      return;
    }
    
    // 生成敌人
    this.spawnEnemies(delta);
    
    // 检查波次是否完成
    if (this.enemiesRemaining <= 0) {
      this.completeWave();
    }
  }

  /**
   * 生成敌人
   * @param {number} delta - 帧间隔时间
   */
  spawnEnemies(delta) {
    if (this.currentEnemyGroupIndex >= this.currentWaveData.enemies.length) {
      return;
    }
    
    const enemyGroup = this.currentWaveData.enemies[this.currentEnemyGroupIndex];
    
    this.enemySpawnTimer += delta;
    
    // 检查是否到了生成时间
    if (this.enemySpawnTimer >= enemyGroup.delay) {
      this.enemySpawnTimer = 0;
      
      // 检查是否需要生成编队
      if (enemyGroup.formation) {
        this.spawnFormation(enemyGroup);
      } else {
        this.spawnSingleEnemy(enemyGroup);
      }
      
      // 移动到下一个敌人
      this.currentEnemyIndex++;
      
      // 检查当前敌人组是否完成
      if (this.currentEnemyIndex >= enemyGroup.count) {
        this.currentEnemyIndex = 0;
        this.currentEnemyGroupIndex++;
      }
    }
  }

  /**
   * 生成单个敌人
   * @param {Object} enemyGroup - 敌人组配置
   */
  spawnSingleEnemy(enemyGroup) {
    // 随机X位置
    const x = Phaser.Math.Between(50, this.scene.game.config.width - 50);
    const y = -50;
    
    // 调用回调生成敌人
    if (this.spawnEnemyCallback) {
      const enemy = this.spawnEnemyCallback(
        x,
        y,
        enemyGroup.type,
        enemyGroup.behavior,
        enemyGroup.canAttack
      );
      
      // 触发敌人生成回调
      if (this.onEnemySpawn && enemy) {
        this.onEnemySpawn(enemy);
      }
    }
  }

  /**
   * 生成编队敌人
   * @param {Object} enemyGroup - 敌人组配置
   */
  spawnFormation(enemyGroup) {
    const gameWidth = this.scene.game.config.width;
    const formationWidth = gameWidth * 0.8;
    const spacing = formationWidth / (enemyGroup.count + 1);
    const startX = (gameWidth - formationWidth) / 2;
    const y = -50;
    
    // 生成所有编队敌人
    for (let i = 0; i < enemyGroup.count; i++) {
      const x = startX + spacing * (i + 1);
      
      // 调用回调生成敌人
      if (this.spawnEnemyCallback) {
        const enemy = this.spawnEnemyCallback(
          x,
          y + (i * 30), // 错开Y位置
          enemyGroup.type,
          enemyGroup.behavior,
          enemyGroup.canAttack,
          x // 编队X位置
        );
        
        // 触发敌人生成回调
        if (this.onEnemySpawn && enemy) {
          this.onEnemySpawn(enemy);
        }
      }
    }
    
    // 编队一次生成所有敌人，所以需要调整索引
    this.currentEnemyIndex = enemyGroup.count;
  }

  /**
   * 敌人被消灭时调用
   */
  enemyDestroyed() {
    this.enemiesRemaining--;
  }

  /**
   * 完成当前波次
   */
  completeWave() {
    // 触发波次完成回调
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWaveData, this.currentWaveIndex);
    }
    
    console.log(`完成波次 ${this.currentWaveData.waveNumber}`);
    
    // 移动到下一个波次
    this.currentWaveIndex++;
    this.currentWaveData = null;
    
    // 延迟后开始下一个波次
    this.scene.time.delayedCall(this.waveDelay, () => {
      if (this.isPlaying) {
        this.startNextWave();
      }
    });
  }

  /**
   * 获取当前波次信息
   * @returns {Object} 当前波次信息
   */
  getCurrentWaveInfo() {
    return {
      level: this.currentLevel,
      waveIndex: this.currentWaveIndex,
      waveData: this.currentWaveData,
      enemiesRemaining: this.enemiesRemaining,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused
    };
  }

  /**
   * 保存波次进度到LocalStorage
   */
  saveWaveData() {
    const data = {
      currentLevel: this.currentLevel,
      currentWaveIndex: this.currentWaveIndex,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('spaceShooterWaveData', JSON.stringify(data));
    } catch (e) {
      console.warn('无法保存波次数据到LocalStorage:', e);
    }
  }

  /**
   * 从LocalStorage加载波次进度
   */
  loadWaveData() {
    try {
      const saved = localStorage.getItem('spaceShooterWaveData');
      if (saved) {
        const data = JSON.parse(saved);
        this.savedLevel = data.currentLevel || 1;
        this.savedWaveIndex = data.currentWaveIndex || 0;
      }
    } catch (e) {
      console.warn('无法从LocalStorage加载波次数据:', e);
    }
  }

  /**
   * 重置所有波次进度
   */
  resetProgress() {
    try {
      localStorage.removeItem('spaceShooterWaveData');
    } catch (e) {
      console.warn('无法重置波次数据:', e);
    }
    
    this.currentLevel = 1;
    this.currentWaveIndex = 0;
  }

  /**
   * 销毁波次系统
   */
  destroy() {
    this.stop();
    this.spawnEnemyCallback = null;
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onLevelComplete = null;
    this.onEnemySpawn = null;
    this.currentWaveData = null;
  }
}

/**
 * 波次管理器
 * 提供更高级的波次管理功能
 */
export class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.waveSystems = new Map();
    
    // 当前活动的波次系统
    this.activeWaveSystem = null;
  }

  /**
   * 创建波次系统
   * @param {string} name - 波次系统名称
   * @param {Function} spawnEnemyCallback - 生成敌人的回调函数
   * @returns {WaveSystem} 波次系统实例
   */
  createWaveSystem(name, spawnEnemyCallback) {
    const waveSystem = new WaveSystem(this.scene, spawnEnemyCallback);
    this.waveSystems.set(name, waveSystem);
    return waveSystem;
  }

  /**
   * 获取波次系统
   * @param {string} name - 波次系统名称
   * @returns {WaveSystem} 波次系统实例
   */
  getWaveSystem(name) {
    return this.waveSystems.get(name);
  }

  /**
   * 设置活动波次系统
   * @param {string} name - 波次系统名称
   */
  setActiveWaveSystem(name) {
    const waveSystem = this.waveSystems.get(name);
    if (waveSystem) {
      // 暂停其他波次系统
      this.waveSystems.forEach((ws, key) => {
        if (key !== name) {
          ws.pause();
        }
      });
      
      this.activeWaveSystem = waveSystem;
    }
  }

  /**
   * 更新所有波次系统
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    this.waveSystems.forEach(waveSystem => {
      waveSystem.update(time, delta);
    });
  }

  /**
   * 销毁所有波次系统
   */
  destroy() {
    this.waveSystems.forEach(waveSystem => {
      waveSystem.destroy();
    });
    this.waveSystems.clear();
    this.activeWaveSystem = null;
  }
}
