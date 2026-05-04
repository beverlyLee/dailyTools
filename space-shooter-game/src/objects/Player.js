import Phaser from 'phaser';
import { GameConfig } from '../config.js';

/**
 * 玩家类
 * 控制玩家飞船的移动、射击和生命值
 */
export class Player extends Phaser.GameObjects.Sprite {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - Phaser场景实例
   */
  constructor(scene) {
    // 调用父类构造函数
    super(scene, 0, 0, 'player');
    
    // 添加到场景
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // 初始化属性
    this.health = GameConfig.PLAYER.HEALTH;
    this.maxHealth = GameConfig.PLAYER.HEALTH;
    this.speed = GameConfig.PLAYER.SPEED;
    this.shootCooldown = GameConfig.PLAYER.SHOOT_COOLDOWN;
    this.lastShootTime = 0;
    
    // 无敌状态
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = GameConfig.PLAYER.INVINCIBLE_TIME;
    
    // 设置物理属性
    this.setupPhysics();
  }

  /**
   * 设置物理属性
   */
  setupPhysics() {
    if (this.body) {
      // 设置碰撞体大小（比精灵稍小）
      this.body.setSize(this.width * 0.6, this.height * 0.6);
      
      // 禁用重力
      this.body.setAllowGravity(false);
      
      // 设置碰撞边界
      this.body.setCollideWorldBounds(true);
      
      // 设置速度限制
      this.body.maxVelocity.x = this.speed * 60;
      this.body.maxVelocity.y = this.speed * 60;
    }
  }

  /**
   * 移动玩家
   * @param {number} directionX - X方向（-1, 0, 1）
   * @param {number} directionY - Y方向（-1, 0, 1）
   */
  move(directionX, directionY) {
    if (!this.active) {
      return;
    }
    
    // 标准化方向向量（避免对角线移动更快）
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    
    if (length > 0) {
      directionX /= length;
      directionY /= length;
    }
    
    // 设置速度
    const velocityX = directionX * this.speed * 60;
    const velocityY = directionY * this.speed * 60;
    
    if (this.body) {
      this.body.setVelocity(velocityX, velocityY);
    }
  }

  /**
   * 射击
   * @param {BulletPool} bulletPool - 子弹对象池
   * @returns {Bullet|null} 发射的子弹
   */
  shoot(bulletPool) {
    if (!this.active) {
      return null;
    }
    
    // 检查射击冷却
    const now = this.scene.time.now;
    if (now - this.lastShootTime < this.shootCooldown) {
      return null;
    }
    
    this.lastShootTime = now;
    
    // 从对象池获取子弹
    const bullet = bulletPool.get(
      this.x,
      this.y - this.height / 2,
      { damage: GameConfig.BULLET.DAMAGE }
    );
    
    // 设置子弹向上移动
    if (bullet && bullet.body) {
      bullet.setVelocityY(-GameConfig.BULLET.SPEED * 60);
    }
    
    return bullet;
  }

  /**
   * 受到伤害
   * @param {number} damage - 伤害值
   */
  takeDamage(damage = 1) {
    if (this.isInvincible) {
      return;
    }
    
    // 减少生命值
    this.health -= damage;
    
    // 进入无敌状态
    this.enterInvincibleState();
    
    // 播放受伤效果
    this.playDamageEffect();
    
    // 检查是否死亡
    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * 进入无敌状态
   */
  enterInvincibleState() {
    this.isInvincible = true;
    this.invincibleTimer = 0;
    
    // 闪烁效果
    this.startInvincibleAnimation();
  }

  /**
   * 开始无敌闪烁动画
   */
  startInvincibleAnimation() {
    // 创建闪烁效果
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(this.invincibleDuration / 200) - 1,
      onComplete: () => {
        this.isInvincible = false;
        if (this.active) {
          this.setAlpha(1);
        }
      }
    });
  }

  /**
   * 播放受伤效果
   */
  playDamageEffect() {
    // 可以在这里添加音效
    // this.scene.sound.play('playerHit');
    
    // 简单的视觉效果
    if (this.setTint) {
      this.setTint(0xff0000);
      
      // 延迟后恢复颜色
      this.scene.time.delayedCall(100, () => {
        if (this.active && this.clearTint) {
          this.clearTint();
        }
      });
    }
  }

  /**
   * 死亡
   */
  die() {
    // 停止物理运动
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
    
    // 播放死亡效果
    this.playDeathEffect();
    
    // 禁用玩家
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * 播放死亡效果
   */
  playDeathEffect() {
    // 创建爆炸效果
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion');
    
    // 缩放和透明度动画
    this.scene.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        explosion.destroy();
      }
    });
  }

  /**
   * 增加生命值
   * @param {number} amount - 增加的生命值
   */
  addHealth(amount = 1) {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  /**
   * 重置玩家状态
   */
  reset() {
    this.health = this.maxHealth;
    this.isInvincible = false;
    
    // 重置位置到屏幕底部中央
    this.setPosition(
      GameConfig.WIDTH / 2,
      GameConfig.HEIGHT - 80
    );
    
    // 恢复可见性和活动状态
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
    
    // 清除颜色
    if (this.clearTint) {
      this.clearTint();
    }
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
    
    // 更新无敌计时器
    if (this.isInvincible) {
      this.invincibleTimer += delta;
      if (this.invincibleTimer >= this.invincibleDuration) {
        this.isInvincible = false;
      }
    }
  }

  /**
   * 销毁玩家
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
