import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config.js';

export class Ball {
  constructor(scene, x, y) {
    this.scene = scene;
    this.radius = PHYSICS_CONFIG.ball.radius;
    
    this.create(x, y);
  }

  create(x, y) {
    const config = {
      x: x,
      y: y,
      shape: {
        type: 'circle',
        radius: this.radius
      },
      density: PHYSICS_CONFIG.ball.density,
      friction: PHYSICS_CONFIG.ball.friction,
      frictionAir: PHYSICS_CONFIG.ball.frictionAir,
      restitution: PHYSICS_CONFIG.ball.restitution,
      label: 'ball'
    };

    this.gameObject = this.scene.matter.add.circle(x, y, this.radius, config);
    this.matterBody = this.gameObject.body;
    
    this.graphics = this.scene.add.graphics();
    this.render();
  }

  render() {
    this.graphics.clear();
    
    const baseColor = 0xc0c0c0;
    const posX = this.matterBody.position.x;
    const posY = this.matterBody.position.y;
    
    this.graphics.fillStyle(baseColor, 1);
    this.graphics.beginPath();
    this.graphics.arc(posX, posY, this.radius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    this.graphics.lineStyle(2, 0x666666, 1);
    this.graphics.beginPath();
    this.graphics.arc(posX, posY, this.radius, 0, Math.PI * 2);
    this.graphics.closePath();
    this.graphics.strokePath();
    
    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.beginPath();
    this.graphics.arc(
      posX - this.radius * 0.3, 
      posY - this.radius * 0.3, 
      this.radius * 0.3, 
      0, Math.PI * 2
    );
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  applyForce(forceX, forceY) {
    this.scene.matter.applyForce(this.matterBody, { x: forceX, y: forceY });
  }

  setVelocity(vx, vy) {
    this.scene.matter.setVelocity(this.matterBody, vx, vy);
  }

  getVelocity() {
    return {
      x: this.matterBody.velocity.x,
      y: this.matterBody.velocity.y
    };
  }

  getPosition() {
    return {
      x: this.matterBody.position.x,
      y: this.matterBody.position.y
    };
  }

  setStatic(isStatic) {
    Phaser.Physics.Matter.Matter.Body.setStatic(this.matterBody, isStatic);
  }

  setVelocityDirect(vx, vy) {
    Phaser.Physics.Matter.Matter.Body.setVelocity(this.matterBody, { x: vx, y: vy });
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
    if (this.matterBody) {
      this.scene.matter.world.remove(this.matterBody);
    }
    if (this.gameObject) {
      this.gameObject.destroy();
    }
  }

  update() {
    this.render();
  }
}
