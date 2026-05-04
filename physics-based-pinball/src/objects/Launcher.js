import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';

export class Launcher {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 300;
    this.power = PHYSICS_CONFIG.launcher.power;
    this.maxPower = PHYSICS_CONFIG.launcher.maxPower;
    this.isCharging = false;
    this.launchingBall = null;
    this.ballStartY = 0;

    this.create();
  }

  create() {
    const wallConfig = {
      isStatic: true,
      restitution: 0.3,
      friction: 0.5,
      label: 'launcher_wall'
    };

    const wallLeftX = this.x - this.width/2 - 15;
    const wallRightX = this.x + this.width/2 + 15;
    const wallCenterY = this.y;

    this.leftWall = this.scene.matter.add.rectangle(
      wallLeftX,
      wallCenterY,
      30,
      this.height,
      wallConfig
    );

    this.rightWall = this.scene.matter.add.rectangle(
      wallRightX,
      wallCenterY,
      30,
      this.height,
      wallConfig
    );

    const baseY = wallCenterY + this.height/2 - 15;
    this.base = this.scene.matter.add.rectangle(
      this.x,
      baseY,
      this.width + 40,
      30,
      {
        isStatic: true,
        label: 'launcher_base'
      }
    );

    this.ballStartY = baseY - 15 - PHYSICS_CONFIG.ball.radius;

    this.graphics = this.scene.add.graphics();
    this.render();
  }

  getBallStartPosition() {
    return {
      x: this.x,
      y: this.ballStartY
    };
  }

  render() {
    this.graphics.clear();
    
    const wallLeftX = this.x - this.width/2 - 15;
    const wallRightX = this.x + this.width/2 + 15;
    const baseY = this.y + this.height/2 - 15;
    
    this.graphics.fillStyle(0x4a4a6c, 1);
    this.graphics.fillRect(
      wallLeftX - 15,
      this.y - this.height/2,
      30,
      this.height
    );
    this.graphics.fillRect(
      wallRightX - 15,
      this.y - this.height/2,
      30,
      this.height
    );
    
    this.graphics.fillStyle(0x8B4513, 1);
    this.graphics.fillRect(
      this.x - this.width/2 - 20,
      baseY - 15,
      this.width + 40,
      30
    );
    
    this.graphics.lineStyle(3, 0xCD853F, 1);
    this.graphics.strokeRect(
      this.x - this.width/2 - 20,
      baseY - 15,
      this.width + 40,
      30
    );
    
    if (this.isCharging) {
      const powerRatio = this.power / this.maxPower;
      const barHeight = this.height * 0.7 * powerRatio;
      
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 0, g: 255, b: 0 },
        { r: 255, g: 0, b: 0 },
        100,
        powerRatio * 100
      );
      
      this.graphics.fillStyle(
        Phaser.Display.Color.GetColor(color.r, color.g, color.b),
        0.9
      );
      this.graphics.fillRect(
        this.x - this.width/2 + 5,
        baseY - barHeight - 15,
        this.width - 10,
        barHeight
      );
      
      this.graphics.lineStyle(2, 0xffffff, 0.8);
      this.graphics.strokeRect(
        this.x - this.width/2,
        this.y - this.height/2,
        this.width,
        this.height
      );
    }
  }

  charge() {
    this.isCharging = true;
    this.power = PHYSICS_CONFIG.launcher.power;
    this.render();
  }

  increasePower() {
    this.power = Math.min(this.power + 0.001, this.maxPower);
    this.render();
  }

  launch(ball) {
    if (!ball) return;

    this.isCharging = false;
    this.launchingBall = ball;
    
    const powerRatio = this.power / this.maxPower;
    const minVelocity = -8;
    const maxVelocity = -20;
    const velocityY = minVelocity + (maxVelocity - minVelocity) * powerRatio;
    
    ball.setStatic(false);
    
    this.scene.time.delayedCall(50, () => {
      if (ball && ball.matterBody) {
        ball.setVelocityDirect(0, velocityY);
      }
    });
    
    this.power = PHYSICS_CONFIG.launcher.power;
    this.render();
    
    this.scene.time.delayedCall(1000, () => {
      this.launchingBall = null;
    });
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
    if (this.leftWall) {
      this.scene.matter.world.remove(this.leftWall);
    }
    if (this.rightWall) {
      this.scene.matter.world.remove(this.rightWall);
    }
  }
}
