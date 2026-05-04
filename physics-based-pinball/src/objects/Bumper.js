import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';

export class Bumper {
  constructor(scene, x, y, radius = null, points = null) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius || PHYSICS_CONFIG.bumper.radius;
    this.points = points || PHYSICS_CONFIG.bumper.points;
    this.isActive = false;
    this.activeTime = 0;

    this.create();
  }

  create() {
    const config = {
      isStatic: true,
      restitution: PHYSICS_CONFIG.bumper.restitution,
      label: 'bumper'
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
    
    const baseColor = this.isActive ? 0xff6b6b : 0xe94560;
    const glowColor = this.isActive ? 0xffff00 : 0xff6b6b;
    
    if (this.isActive) {
      this.graphics.lineStyle(4, glowColor, 0.8);
      this.graphics.beginPath();
      this.graphics.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      this.graphics.closePath();
      this.graphics.strokePath();
    }
    
    this.graphics.fillStyle(baseColor, 1);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    this.graphics.lineStyle(3, 0xffffff, 0.5);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.strokePath();
    
    const innerRadius = this.radius * 0.6;
    this.graphics.fillStyle(0xff8a8a, 0.8);
    this.graphics.beginPath();
    this.graphics.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  activate() {
    this.isActive = true;
    this.activeTime = 200;
    this.render();
    
    this.scene.time.delayedCall(150, () => {
      this.isActive = false;
      this.render();
    });
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
