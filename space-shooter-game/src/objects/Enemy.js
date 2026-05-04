import Phaser from 'phaser';
import { TransitionStateMachine, Transition } from '../fsm/StateMachine.js';
import { 
  EnemyIdleState, 
  EnemyMovingState, 
  EnemyAttackingState, 
  EnemyDamagedState,
  EnemyDyingState,
  EnemyDeadState
} from './EnemyStates.js';
import { EnemyState, EnemyBehavior, GameConfig, Colors } from '../config.js';

/**
 * 敌人类
 * 
 * 敌人是游戏中的主要对手，具有多种行为模式：
 * - 直线冲锋：直接向下移动
 * - 曲线移动：使用正弦函数实现波浪形轨迹
 * - 编队移动：保持固定的水平位置
 * - Z字形移动：左右来回移动
 * 
 * 敌人使用状态机来管理不同的状态：
 * - 空闲（IDLE）：刚创建时
 * - 移动（MOVING）：正常移动
 * - 攻击（ATTACKING）：发射子弹攻击玩家
 * - 受伤（DAMAGED）：受到攻击时
 * - 死亡（DYING）：即将死亡，播放动画
 * - 已死亡（DEAD）：完全死亡，准备释放
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - Phaser场景实例
   */
  constructor(scene) {
    // 调用父类构造函数，使用临时位置
    super(scene, -1000, -1000, 'enemy');
    
    // 添加到场景
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // 初始化属性
    this.type = 'BASIC';
    this.health = 1;
    this.maxHealth = 1;
    this.speed = 2;
    this.score = 100;
    this.behavior = EnemyBehavior.STRAIGHT;
    this.formationX = null;
    
    // 对象池引用
    this.pool = null;
    
    // 初始化状态机
    this.initStateMachine();
    
    // 设置物理属性
    this.setupPhysics();
  }

  /**
   * 初始化状态机
   */
  initStateMachine() {
    // 创建状态机
    this.stateMachine = new TransitionStateMachine(this);
    
    // 添加所有状态
    this.stateMachine.addState(new EnemyIdleState());
    this.stateMachine.addState(new EnemyMovingState());
    this.stateMachine.addState(new EnemyAttackingState());
    this.stateMachine.addState(new EnemyDamagedState());
    this.stateMachine.addState(new EnemyDyingState());
    this.stateMachine.addState(new EnemyDeadState());
    
    // 添加状态转换规则
    // 空闲 -> 移动：自动转换
    this.stateMachine.addTransition(
      new Transition(EnemyState.IDLE, EnemyState.MOVING, () => false)
    );
    
    // 移动 -> 攻击：随机触发（只有某些敌人才会攻击）
    this.stateMachine.addTransition(
      new Transition(EnemyState.MOVING, EnemyState.ATTACKING, (owner) => {
        return owner.canAttack && Math.random() < 0.001;
      })
    );
    
    // 攻击 -> 移动：攻击结束后
    this.stateMachine.addTransition(
      new Transition(EnemyState.ATTACKING, EnemyState.MOVING, (owner) => {
        return Math.random() < 0.005;
      })
    );
    
    // 任何状态 -> 受伤：当health减少时
    // 这将在takeDamage方法中手动触发
    
    // 受伤 -> 移动：当health > 0时（在状态中处理）
    // 受伤 -> 死亡：当health <= 0时（在状态中处理）
  }

  /**
   * 设置物理属性
   */
  setupPhysics() {
    // 设置碰撞体大小
    if (this.body) {
      this.body.setCollideWorldBounds(false);
      this.body.setAllowGravity(false);
      
      // 设置碰撞体大小（比精灵稍小）
      this.body.setSize(this.width * 0.7, this.height * 0.7);
    }
  }

  /**
   * 从对象池唤醒时调用
   * @param {Object} data - 初始化数据
   */
  wake(data) {
    // 重置状态
    this.type = data.type || 'BASIC';
    this.behavior = data.behavior || EnemyBehavior.STRAIGHT;
    this.formationX = data.formationX || null;
    
    // 根据类型设置属性
    const enemyConfig = GameConfig.ENEMY.TYPES[this.type] || GameConfig.ENEMY.TYPES.BASIC;
    this.health = enemyConfig.HEALTH;
    this.maxHealth = enemyConfig.HEALTH;
    this.speed = enemyConfig.SPEED;
    this.score = enemyConfig.SCORE;
    this.canAttack = data.canAttack || false;
    
    // 重置透明度和颜色
    if (this.setAlpha) this.setAlpha(1);
    if (this.clearTint) this.clearTint();
    
    // 重置状态机到初始状态
    this.stateMachine.changeState(EnemyState.IDLE);
    
    // 设置外观
    this.setAppearance();
  }

  /**
   * 设置敌人外观
   */
  setAppearance() {
    // 根据类型设置不同的颜色
    switch (this.type) {
      case 'BASIC':
        this.setTint(0x00ff00); // 绿色
        break;
      case 'FAST':
        this.setTint(0xffff00); // 黄色
        break;
      case 'HEAVY':
        this.setTint(0xff0000); // 红色
        break;
      case 'FORMATION':
        this.setTint(0x00ffff); // 青色
        break;
      default:
        this.setTint(0x00ff00); // 默认绿色
    }
    
    // 根据健康值设置大小
    const scale = 0.5 + (this.maxHealth * 0.2);
    this.setScale(scale);
  }

  /**
   * 放回对象池时调用
   */
  sleep() {
    // 停止所有动画
    if (this.anims) {
      this.anims.stop();
    }
    
    // 重置位置（移出屏幕）
    this.setPosition(-1000, -1000);
    
    // 停止物理运动
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
    
    // 重置状态机
    this.stateMachine.clear();
  }

  /**
   * 受到伤害
   * @param {number} damage - 伤害值
   */
  takeDamage(damage = 1) {
    this.health -= damage;
    
    // 切换到受伤状态
    if (this.stateMachine.isInState(EnemyState.MOVING) || 
        this.stateMachine.isInState(EnemyState.ATTACKING)) {
      this.stateMachine.changeState(EnemyState.DAMAGED);
    }
  }

  /**
   * 释放敌人回对象池
   */
  release() {
    if (this.pool) {
      this.pool.release(this);
    }
  }

  /**
   * 更新方法
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    // 更新状态机
    if (this.stateMachine) {
      this.stateMachine.update(time, delta);
    }
  }
}

/**
 * 基础敌人类（绿色）
 * 直线冲锋，生命值低，速度中等
 */
export class BasicEnemy extends Enemy {
  constructor(scene) {
    super(scene);
    this.type = 'BASIC';
  }
}

/**
 * 快速敌人类（黄色）
 * 曲线移动，生命值低，速度快
 */
export class FastEnemy extends Enemy {
  constructor(scene) {
    super(scene);
    this.type = 'FAST';
  }
}

/**
 * 重型敌人类（红色）
 * 直线冲锋，生命值高，速度慢
 */
export class HeavyEnemy extends Enemy {
  constructor(scene) {
    super(scene);
    this.type = 'HEAVY';
  }
}

/**
 * 编队敌人类（青色）
 * 编队移动，生命值中等，速度中等
 */
export class FormationEnemy extends Enemy {
  constructor(scene) {
    super(scene);
    this.type = 'FORMATION';
  }
}
