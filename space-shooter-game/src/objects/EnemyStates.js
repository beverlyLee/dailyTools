import { State } from '../fsm/StateMachine.js';
import { EnemyState, EnemyBehavior, GameConfig } from '../config.js';

/**
 * 敌人空闲状态
 * 敌人刚创建时的状态，准备进入移动状态
 */
export class EnemyIdleState extends State {
  constructor() {
    super(EnemyState.IDLE);
  }

  enter(owner) {
    super.enter(owner);
    // 重置状态计时器
    this.stateTimer = 0;
  }

  update(time, delta) {
    // 空闲状态只持续很短时间，然后切换到移动状态
    this.stateTimer += delta;
    
    // 0.1秒后切换到移动状态
    if (this.stateTimer >= 100) {
      this.owner.stateMachine.changeState(EnemyState.MOVING);
    }
  }
}

/**
 * 敌人移动状态
 * 根据不同的行为模式实现不同的移动方式
 */
export class EnemyMovingState extends State {
  constructor() {
    super(EnemyState.MOVING);
  }

  enter(owner) {
    super.enter(owner);
    // 初始化移动相关的变量
    this.moveTimer = 0;
    this.startX = owner.x;
    this.startY = owner.y;
    
    // 根据敌人类型设置不同的速度和行为
    this.setupBehavior();
  }

  /**
   * 根据敌人行为类型设置移动参数
   */
  setupBehavior() {
    const owner = this.owner;
    
    switch (owner.behavior) {
      case EnemyBehavior.STRAIGHT:
        // 直线冲锋：直接向下移动
        this.moveStraight();
        break;
      case EnemyBehavior.CURVE:
        // 曲线移动：使用正弦函数实现曲线轨迹
        this.moveCurve();
        break;
      case EnemyBehavior.FORMATION:
        // 编队移动：保持固定的移动模式
        this.moveFormation();
        break;
      case EnemyBehavior.ZIGZAG:
        // Z字形移动
        this.moveZigzag();
        break;
      default:
        // 默认直线移动
        this.moveStraight();
    }
  }

  /**
   * 直线移动
   */
  moveStraight() {
    const owner = this.owner;
    // 简单的向下移动
    owner.body.setVelocity(0, owner.speed * 60);
  }

  /**
   * 曲线移动
   * 使用正弦函数实现波浪形轨迹
   */
  moveCurve() {
    const owner = this.owner;
    this.amplitude = 100; // 曲线振幅
    this.frequency = 2; // 频率
    this.phase = Math.random() * Math.PI * 2; // 随机相位
    
    // 垂直速度
    owner.body.setVelocityY(owner.speed * 60);
  }

  /**
   * 编队移动
   * 保持固定的水平位置移动
   */
  moveFormation() {
    const owner = this.owner;
    this.targetX = owner.formationX || owner.x;
    this.lateralSpeed = 100;
    
    // 垂直速度
    owner.body.setVelocityY(owner.speed * 60);
  }

  /**
   * Z字形移动
   * 左右来回移动
   */
  moveZigzag() {
    const owner = this.owner;
    this.zigzagDirection = 1; // 1 = 向右, -1 = 向左
    this.zigzagTimer = 0;
    this.zigzagInterval = 1000; // 1秒切换一次方向
    
    // 垂直速度
    owner.body.setVelocityY(owner.speed * 60);
  }

  update(time, delta) {
    const owner = this.owner;
    this.moveTimer += delta;
    
    // 根据不同的行为模式更新移动
    switch (owner.behavior) {
      case EnemyBehavior.STRAIGHT:
        // 直线移动不需要额外处理
        break;
      case EnemyBehavior.CURVE:
        this.updateCurveMovement(delta);
        break;
      case EnemyBehavior.FORMATION:
        this.updateFormationMovement(delta);
        break;
      case EnemyBehavior.ZIGZAG:
        this.updateZigzagMovement(delta);
        break;
    }
  }

  /**
   * 更新曲线移动
   */
  updateCurveMovement(delta) {
    const owner = this.owner;
    // 使用正弦函数计算水平偏移
    const offset = Math.sin((this.moveTimer / 1000) * this.frequency + this.phase) * this.amplitude;
    const targetX = this.startX + offset;
    
    // 平滑移动到目标X位置
    const dx = targetX - owner.x;
    owner.body.setVelocityX(dx * 3);
  }

  /**
   * 更新编队移动
   */
  updateFormationMovement(delta) {
    const owner = this.owner;
    // 水平方向平滑移动到目标位置
    const dx = this.targetX - owner.x;
    if (Math.abs(dx) > 2) {
      owner.body.setVelocityX(Math.sign(dx) * this.lateralSpeed);
    } else {
      owner.body.setVelocityX(0);
    }
  }

  /**
   * 更新Z字形移动
   */
  updateZigzagMovement(delta) {
    const owner = this.owner;
    this.zigzagTimer += delta;
    
    // 每隔一段时间切换方向
    if (this.zigzagTimer >= this.zigzagInterval) {
      this.zigzagTimer = 0;
      this.zigzagDirection *= -1;
    }
    
    // 设置水平速度
    owner.body.setVelocityX(this.zigzagDirection * 100);
  }
}

/**
 * 敌人攻击状态
 * 敌人可以发射子弹攻击玩家
 */
export class EnemyAttackingState extends State {
  constructor() {
    super(EnemyState.ATTACKING);
  }

  enter(owner) {
    super.enter(owner);
    this.attackTimer = 0;
    this.attackCooldown = 2000; // 2秒攻击间隔
    
    // 可以继续移动
    if (owner.body) {
      owner.body.setVelocityY(owner.speed * 30); // 攻击时移动较慢
    }
  }

  update(time, delta) {
    const owner = this.owner;
    this.attackTimer += delta;
    
    // 到达攻击间隔时发射子弹
    if (this.attackTimer >= this.attackCooldown) {
      this.attackTimer = 0;
      this.fire();
    }
  }

  /**
   * 发射子弹
   */
  fire() {
    const owner = this.owner;
    // 获取场景中的子弹对象池
    const scene = owner.scene;
    
    if (scene && scene.enemyBulletPool) {
      // 从对象池获取子弹
      const bullet = scene.enemyBulletPool.get(
        owner.x,
        owner.y + owner.height / 2,
        { damage: 1 }
      );
      
      // 设置子弹向下移动
      if (bullet && bullet.body) {
        bullet.body.setVelocityY(300);
      }
    }
  }
}

/**
 * 敌人受伤状态
 * 当敌人受到攻击时进入此状态
 */
export class EnemyDamagedState extends State {
  constructor() {
    super(EnemyState.DAMAGED);
  }

  enter(owner) {
    super.enter(owner);
    this.damageTimer = 0;
    this.damageDuration = 200; // 受伤状态持续时间
    
    // 闪烁效果
    if (owner.tint) {
      owner.setTint(0xff0000); // 红色闪烁
    }
    
    // 暂停移动
    if (owner.body) {
      owner.body.setVelocity(0, 0);
    }
  }

  update(time, delta) {
    this.damageTimer += delta;
    
    // 受伤状态结束后，检查生命值
    if (this.damageTimer >= this.damageDuration) {
      const owner = this.owner;
      
      // 恢复颜色
      if (owner.clearTint) {
        owner.clearTint();
      }
      
      // 检查是否死亡
      if (owner.health <= 0) {
        this.owner.stateMachine.changeState(EnemyState.DYING);
      } else {
        // 没有死亡，回到移动状态
        this.owner.stateMachine.changeState(EnemyState.MOVING);
      }
    }
  }
}

/**
 * 敌人死亡状态
 * 敌人即将死亡，播放死亡动画
 */
export class EnemyDyingState extends State {
  constructor() {
    super(EnemyState.DYING);
  }

  enter(owner) {
    super.enter(owner);
    this.deathTimer = 0;
    this.deathDuration = 500; // 死亡动画持续时间
    
    // 停止移动
    if (owner.body) {
      owner.body.setVelocity(0, 0);
    }
    
    // 播放死亡效果
    this.playDeathEffect();
    
    // 增加分数
    if (owner.scene && owner.scene.addScore) {
      owner.scene.addScore(owner.score);
    }
  }

  /**
   * 播放死亡效果
   */
  playDeathEffect() {
    const owner = this.owner;
    const scene = owner.scene;
    
    // 创建爆炸粒子效果
    if (scene && scene.add) {
      // 简单的闪烁效果
      if (owner.setAlpha) {
        owner.setAlpha(0.5);
      }
      
      // 可以在这里添加更复杂的爆炸效果
      if (scene.add && scene.add.particles) {
        // 粒子效果代码可以在这里添加
      }
    }
  }

  update(time, delta) {
    this.deathTimer += delta;
    
    // 死亡动画结束后，切换到已死亡状态
    if (this.deathTimer >= this.deathDuration) {
      this.owner.stateMachine.changeState(EnemyState.DEAD);
    }
  }
}

/**
 * 敌人已死亡状态
 * 敌人完全死亡，准备释放回对象池
 */
export class EnemyDeadState extends State {
  constructor() {
    super(EnemyState.DEAD);
  }

  enter(owner) {
    super.enter(owner);
    
    // 重置敌人状态，准备释放回对象池
    if (owner.scene && owner.release) {
      // 延迟一点时间释放，确保所有状态都已处理
      owner.scene.time.delayedCall(100, () => {
        owner.release();
      });
    }
  }

  update(time, delta) {
    // 已死亡状态不需要更新
  }
}
