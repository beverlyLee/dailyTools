import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';

export class Goal {
  constructor(scene, x, y, radius = null, points = null) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius || PHYSICS_CONFIG.goal.radius;
    this.points = points || PHYSICS_CONFIG.goal.points;
    this.isActive = false;
    this.animationTime = 0;

    this.create();
  }

  create() {
    const config = {
      isStatic: true,
      isSensor: true,
      restitution: 0,
      label: 'goal'
    };

    this.body = this.scene.matter.add.circle(
      this.x,
      this.y,
      this.radius,
      config
    );

    this.graphics = this.scene.add.graphics();
    this.render();
  }

  render() {
    this.graphics.clear();
    
    const pulse = this.isActive ? 0.8 + Math.sin(this.animationTime * 0.1) * 0.2 : 1;
    const color = this.isActive ? 0x00ff88 : 0x00aa44;
    
    this.graphics.lineStyle(4, 0x00ff88, pulse);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.strokePath();
    
    this.graphics.fillStyle(color, 0.4 * pulse);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, this.radius - 5, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    this.graphics.fillStyle(0x00ff88, pulse);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    this.graphics.lineStyle(2, 0x00ff88, 0.5 * pulse);
    this.graphics.beginPath();
    this.graphics.moveTo(this.x - this.radius * 0.5, this.y - this.radius * 0.5);
    this.graphics.lineTo(this.x + this.radius * 0.5, this.y + this.radius * 0.5);
    this.graphics.moveTo(this.x + this.radius * 0.5, this.y - this.radius * 0.5);
    this.graphics.lineTo(this.x - this.radius * 0.5, this.y + this.radius * 0.5);
    this.graphics.strokePath();
  }

  activate() {
    this.isActive = true;
    this.animationTime = 0;
    
    const animate = () => {
      this.animationTime++;
      this.render();
      
      if (this.animationTime < 60) {
        requestAnimationFrame(animate);
      } else {
        this.isActive = false;
        this.render();
      }
    };
    
    animate();
  }

  getPosition() {
    return {
      x: this.x,
      y: this.y
    };
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }
  }
}
