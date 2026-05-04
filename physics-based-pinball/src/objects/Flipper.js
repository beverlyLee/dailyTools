import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';
import Matter from 'matter-js';

export class Flipper {
  constructor(scene, x, y, side = 'right', length = null) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.side = side;
    this.length = length || PHYSICS_CONFIG.flipper.length;
    this.thickness = PHYSICS_CONFIG.flipper.thickness;
    this.isActive = false;
    this.angleMin = PHYSICS_CONFIG.flipper.angleMin;
    this.angleMax = PHYSICS_CONFIG.flipper.angleMax;
    
    if (this.side === 'left') {
      this.angleMin = 0.5;
      this.angleMax = -0.5;
    }

    this.create();
  }

  create() {
    const startAngle = this.side === 'left' ? this.angleMin : this.angleMax;
    
    this.body = this.scene.matter.add.rectangle(
      this.x,
      this.y,
      this.length,
      this.thickness,
      {
        angle: startAngle,
        density: 0.01,
        restitution: PHYSICS_CONFIG.flipper.restitution,
        label: 'flipper'
      }
    );

    const pivotOffset = PHYSICS_CONFIG.flipper.pivotOffset;
    const pivotX = this.side === 'left' 
      ? this.x - this.length/2 + pivotOffset
      : this.x + this.length/2 - pivotOffset;

    this.pivot = this.scene.matter.add.circle(
      pivotX,
      this.y,
      5,
      {
        isStatic: true,
        label: 'flipper_pivot'
      }
    );

    this.constraint = this.scene.matter.add.constraint(
      this.pivot,
      this.body,
      0,
      1,
      {
        pointA: { x: 0, y: 0 },
        pointB: this.side === 'left' 
          ? { x: -this.length/2 + pivotOffset, y: 0 }
          : { x: this.length/2 - pivotOffset, y: 0 }
      }
    );

    this.graphics = this.scene.add.graphics();
    this.render();
  }

  render() {
    this.graphics.clear();
    
    const angle = this.body.angle;
    const color = this.isActive ? 0x66aaff : 0x4a9eff;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const rotatePoint = (px, py) => ({
      x: px * cos - py * sin + this.x,
      y: px * sin + py * cos + this.y
    });
    
    let shapePoints;
    if (this.side === 'left') {
      shapePoints = [
        rotatePoint(-this.length/2, -this.thickness/2),
        rotatePoint(this.length/2 - 20, -this.thickness/2),
        rotatePoint(this.length/2, 0),
        rotatePoint(this.length/2 - 20, this.thickness/2),
        rotatePoint(-this.length/2, this.thickness/2)
      ];
    } else {
      shapePoints = [
        rotatePoint(this.length/2, -this.thickness/2),
        rotatePoint(-this.length/2 + 20, -this.thickness/2),
        rotatePoint(-this.length/2, 0),
        rotatePoint(-this.length/2 + 20, this.thickness/2),
        rotatePoint(this.length/2, this.thickness/2)
      ];
    }
    
    this.graphics.fillStyle(color, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(shapePoints[0].x, shapePoints[0].y);
    for (let i = 1; i < shapePoints.length; i++) {
      this.graphics.lineTo(shapePoints[i].x, shapePoints[i].y);
    }
    this.graphics.closePath();
    this.graphics.fillPath();
    
    this.graphics.lineStyle(2, 0xffffff, 0.5);
    this.graphics.strokePath();
    
    this.graphics.fillStyle(0xffff00, 1);
    this.graphics.beginPath();
    this.graphics.arc(this.pivot.position.x, this.pivot.position.y, 5, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  setActive(active) {
    if (active !== this.isActive) {
      this.isActive = active;
      
      const targetAngle = active 
        ? (this.side === 'left' ? this.angleMax : this.angleMin)
        : (this.side === 'left' ? this.angleMin : this.angleMax);
      
      const angularVelocity = active ? 0.2 : -0.1;
      
      Matter.Body.setAngularVelocity(this.body, angularVelocity);
      Matter.Body.setAngle(this.body, targetAngle);
      
      this.render();
    }
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
    if (this.pivot) {
      this.scene.matter.world.remove(this.pivot);
    }
    if (this.constraint) {
      this.scene.matter.world.remove(this.constraint);
    }
  }
}
