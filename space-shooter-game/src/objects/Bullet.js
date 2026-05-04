import Phaser from 'phaser';
import { GameConfig } from '../config.js';

/**
 * 子弹类
 * 管理玩家和敌人发射的子弹
 * 
 * 子弹使用对象池进行管理，以优化性能。
 * 当子弹超出屏幕边界时，会被释放回对象池。
 */
export class Bullet extends Phaser.GameObjects.Sprite {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - Phaser场景实例
   * @param {string} textureKey - 纹理键名
   * @param {boolean} isPlayerBullet - 是否是玩家子弹
   */
  constructor(scene, textureKey, isPlayerBullet = true) {
    // 调用父类构造函数，使用临时位置
    super(scene, -1000, -1000, textureKey);
    
    // 添加到场景
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // 初始化属性
    this.isPlayerBullet = isPlayerBullet;
    this.damage = GameConfig.BULLET.DAMAGE;
    this.speed = GameConfig.BULLET.SPEED;
    
    // 对象池引用
    this.pool = null;
    
    // 设置物理属性
    this.setupPhysics();
  }

  /**
   * 设置物理属性
   */
  setupPhysics() {
    if (this.body) {
      // 禁用重力
      this.body.setAllowGravity(false);
      
      // 设置碰撞体大小
      this.body.setSize(this.width, this.height);
      
      // 禁用世界边界碰撞（子弹可以飞出屏幕）
      this.body.setCollideWorldBounds(false);
    }
  }

  /**
   * 从对象池唤醒时调用
   * @param {Object} data - 初始化数据
   */
  wake(data) {
    // 重置属性
    this.damage = data?.damage || GameConfig.BULLET.DAMAGE;
    
    // 重置透明度和颜色
    if (this.setAlpha) this.setAlpha(1);
    if (this.clearTint) this.clearTint();
    
    // 重置速度
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
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
  }

  /**
   * 设置子弹速度
   * @param {number} x - X方向速度
   * @param {number} y - Y方向速度
   */
  setVelocity(x, y) {
    if (this.body) {
      this.body.setVelocity(x, y);
    }
  }

  /**
   * 设置X方向速度
   * @param {number} velocity - X方向速度
   */
  setVelocityX(velocity) {
    if (this.body) {
      this.body.setVelocityX(velocity);
    }
  }

  /**
   * 设置Y方向速度
   * @param {number} velocity - Y方向速度
   */
  setVelocityY(velocity) {
    if (this.body) {
      this.body.setVelocityY(velocity);
    }
  }

  /**
   * 检查子弹是否超出屏幕
   * @returns {boolean} 是否超出屏幕
   */
  isOutOfBounds() {
    const gameWidth = this.scene.game.config.width;
    const gameHeight = this.scene.game.config.height;
    
    // 添加一些边界余量
    const margin = 50;
    
    return (
      this.x < -margin ||
      this.x > gameWidth + margin ||
      this.y < -margin ||
      this.y > gameHeight + margin
    );
  }

  /**
   * 释放子弹回对象池
   */
  release() {
    if (this.pool) {
      this.pool.release(this);
    }
  }

  /**
   * 播放子弹效果
   * 可以用于播放尾迹、发光等效果
   */
  playTrailEffect() {
    // 这里可以添加子弹尾迹效果
    // 例如使用粒子系统创建尾迹
  }

  /**
   * 更新方法
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    if (!this.active) {
      return;
    }
    
    // 播放尾迹效果
    this.playTrailEffect();
    
    // 检查是否超出屏幕
    if (this.isOutOfBounds()) {
      this.release();
    }
  }

  /**
   * 销毁子弹
   */
  destroy() {
    // 停止所有动画
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this);
    }
    
    // 调用父类方法
    super.destroy();
  }
}

/**
 * 玩家子弹类
 * 专门用于玩家发射的子弹
 */
export class PlayerBullet extends Bullet {
  constructor(scene) {
    super(scene, 'bullet', true);
  }
}

/**
 * 敌人子弹类
 * 专门用于敌人发射的子弹
 */
export class EnemyBullet extends Bullet {
  constructor(scene) {
    super(scene, 'enemyBullet', false);
    
    // 敌人子弹速度稍慢
    this.speed = GameConfig.BULLET.SPEED * 0.8;
  }
}
