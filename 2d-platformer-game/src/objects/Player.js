import Phaser from 'phaser';
import { PLAYER_CONFIG } from '../config';

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    
    this.scene = scene;
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    
    this.config = { ...PLAYER_CONFIG };
    
    // 物理属性
    this.setCollideWorldBounds(true);
    this.setGravityY(this.config.gravity);
    this.setMaxVelocity(this.config.speed * 1.5, this.config.maxFallSpeed);
    
    // 状态
    this.isOnGround = false;
    this.canDoubleJump = this.config.canDoubleJump;
    this.hasDoubleJumped = false;
    this.facingRight = true;
    
    // 输入
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // 跳跃状态
    this.jumpKeyJustDown = false;
  }
  
  update() {
    // 水平移动
    let moveX = 0;
    
    if (this.cursors.left.isDown) {
      moveX = -1;
      this.facingRight = false;
    } else if (this.cursors.right.isDown) {
      moveX = 1;
      this.facingRight = true;
    }
    
    // 应用空中控制
    const airControlMultiplier = this.isOnGround ? 1 : this.config.airControl;
    const targetVelocityX = moveX * this.config.speed * airControlMultiplier;
    
    // 平滑加速度
    this.setVelocityX(
      Phaser.Math.Linear(this.body.velocity.x, targetVelocityX, 0.2)
    );
    
    // 跳跃
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || 
        (this.cursors.up.isDown && !this.jumpKeyJustDown)) {
      if (this.isOnGround) {
        this.jump();
      } else if (this.canDoubleJump && !this.hasDoubleJumped) {
        this.doubleJump();
      }
      this.jumpKeyJustDown = true;
    }
    
    if (!this.cursors.up.isDown && !this.spaceKey.isDown) {
      this.jumpKeyJustDown = false;
    }
    
    // 地面检测
    this.isOnGround = this.body.touching.down || this.body.blocked.down;
    
    if (this.isOnGround) {
      this.hasDoubleJumped = false;
    }
    
    // 翻转
    if (this.facingRight) {
      this.setFlipX(false);
    } else {
      this.setFlipX(true);
    }
  }
  
  jump() {
    this.setVelocityY(this.config.jumpForce);
    this.emit('jump');
  }
  
  doubleJump() {
    this.setVelocityY(this.config.doubleJumpForce);
    this.hasDoubleJumped = true;
    this.emit('doubleJump');
  }
  
  die() {
    this.emit('die');
    this.scene.playerDie();
  }
  
  collectCoin(coin) {
    coin.destroy();
    this.emit('collectCoin', coin);
  }
  
  getState() {
    return {
      x: this.x,
      y: this.y,
      velocityX: this.body.velocity.x,
      velocityY: this.body.velocity.y,
      facingRight: this.facingRight,
      isOnGround: this.isOnGround,
      hasDoubleJumped: this.hasDoubleJumped
    };
  }
  
  setState(state) {
    this.x = state.x;
    this.y = state.y;
    this.setVelocity(state.velocityX, state.velocityY);
    this.facingRight = state.facingRight;
    this.isOnGround = state.isOnGround;
    this.hasDoubleJumped = state.hasDoubleJumped;
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.setGravityY(this.config.gravity);
    this.setMaxVelocity(this.config.speed * 1.5, this.config.maxFallSpeed);
    this.canDoubleJump = this.config.canDoubleJump;
  }
}

export default Player;
