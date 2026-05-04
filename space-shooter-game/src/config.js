/**
 * 游戏全局配置
 * 集中管理所有游戏相关的常量和配置
 */
export const GameConfig = {
  // 游戏画布尺寸
  WIDTH: 800,
  HEIGHT: 600,
  
  // 调试模式
  DEBUG: false,
  
  // 玩家配置
  PLAYER: {
    SPEED: 5,
    SHOOT_COOLDOWN: 200, // 射击冷却时间（毫秒）
    HEALTH: 3,
    INVINCIBLE_TIME: 2000 // 无敌时间（毫秒）
  },
  
  // 子弹配置
  BULLET: {
    SPEED: 10,
    DAMAGE: 1,
    POOL_SIZE: 20 // 对象池大小
  },
  
  // 敌人配置
  ENEMY: {
    POOL_SIZE: 30, // 对象池大小
    TYPES: {
      BASIC: {
        HEALTH: 1,
        SPEED: 2,
        SCORE: 100,
        BEHAVIOR: 'straight' // 直线冲锋
      },
      FAST: {
        HEALTH: 1,
        SPEED: 4,
        SCORE: 150,
        BEHAVIOR: 'curve' // 曲线移动
      },
      HEAVY: {
        HEALTH: 3,
        SPEED: 1,
        SCORE: 200,
        BEHAVIOR: 'straight' // 直线冲锋
      },
      FORMATION: {
        HEALTH: 2,
        SPEED: 1.5,
        SCORE: 250,
        BEHAVIOR: 'formation' // 编队移动
      }
    }
  },
  
  // 波次配置
  WAVES: {
    WAVE_DELAY: 5000, // 波次间隔（毫秒）
    ENEMY_DELAY: 1000, // 敌人生成间隔（毫秒）
  },
  
  // 难度递增配置
  DIFFICULTY: {
    INCREASE_INTERVAL: 30000, // 难度递增间隔（毫秒）
    SPEED_MULTIPLIER: 1.1, // 速度倍数
    SPAWN_RATE_MULTIPLIER: 0.9 // 生成间隔倍数
  }
};

/**
 * 游戏状态枚举
 */
export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory'
};

/**
 * 敌人行为类型
 */
export const EnemyBehavior = {
  STRAIGHT: 'straight',      // 直线冲锋
  CURVE: 'curve',            // 曲线移动
  FORMATION: 'formation',    // 编队移动
  ZIGZAG: 'zigzag'           // Z字形移动
};

/**
 * 敌人状态机状态
 */
export const EnemyState = {
  IDLE: 'idle',              // 空闲
  MOVING: 'moving',          // 移动
  ATTACKING: 'attacking',    // 攻击
  DAMAGED: 'damaged',        // 受伤
  DYING: 'dying',            // 死亡
  DEAD: 'dead'               // 已死亡
};

/**
 * 颜色配置
 */
export const Colors = {
  WHITE: 0xffffff,
  BLACK: 0x000000,
  RED: 0xff0000,
  GREEN: 0x00ff00,
  BLUE: 0x0000ff,
  YELLOW: 0xffff00,
  PURPLE: 0xff00ff,
  CYAN: 0x00ffff,
  ORANGE: 0xffa500,
  DARK_BLUE: 0x000080,
  DARK_GREEN: 0x008000,
  GRAY: 0x808080,
  LIGHT_GRAY: 0xc0c0c0
};
