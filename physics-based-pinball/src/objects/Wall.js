import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';

export class Wall {
  constructor(scene, x, y, width, height, angle = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.angle = angle;

    this.create();
  }

  create() {
    const config = {
      isStatic: true,
      restitution: PHYSICS_CONFIG.wall.restitution,
      friction: PHYSICS_CONFIG.wall.friction,
      angle: this.angle,
      label: 'wall'
    };

    this.body = this.scene.matter.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      config
    );

    this.graphics = this.scene.add.graphics();
    this.render();
  }

  render() {
    this.graphics.clear();
    
    if (this.angle === 0) {
      this.graphics.fillStyle(0x444466, 1);
      this.graphics.fillRect(
        this.x - this.width/2,
        this.y - this.height/2,
        this.width,
        this.height
      );
      
      this.graphics.lineStyle(2, 0x6666aa, 1);
      this.graphics.strokeRect(
        this.x - this.width/2,
        this.y - this.height/2,
        this.width,
        this.height
      );
      
      this.graphics.lineStyle(1, 0x8888cc, 0.5);
      for (let i = -this.width/2 + 10; i < this.width/2; i += 20) {
        this.graphics.beginPath();
        this.graphics.moveTo(this.x + i, this.y - this.height/2);
        this.graphics.lineTo(this.x + i, this.y + this.height/2);
        this.graphics.strokePath();
      }
    } else {
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      
      const rotatePoint = (px, py) => ({
        x: px * cos - py * sin + this.x,
        y: px * sin + py * cos + this.y
      });
      
      const p1 = rotatePoint(-halfW, -halfH);
      const p2 = rotatePoint(halfW, -halfH);
      const p3 = rotatePoint(halfW, halfH);
      const p4 = rotatePoint(-halfW, halfH);
      
      this.graphics.fillStyle(0x444466, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(p1.x, p1.y);
      this.graphics.lineTo(p2.x, p2.y);
      this.graphics.lineTo(p3.x, p3.y);
      this.graphics.lineTo(p4.x, p4.y);
      this.graphics.closePath();
      this.graphics.fillPath();
      
      this.graphics.lineStyle(2, 0x6666aa, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(p1.x, p1.y);
      this.graphics.lineTo(p2.x, p2.y);
      this.graphics.lineTo(p3.x, p3.y);
      this.graphics.lineTo(p4.x, p4.y);
      this.graphics.closePath();
      this.graphics.strokePath();
    }
  }

  getPosition() {
    return {
      x: this.x,
      y: this.y
    };
  }

  setAngle(angle) {
    this.angle = angle;
    this.body.angle = angle;
    this.render();
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
