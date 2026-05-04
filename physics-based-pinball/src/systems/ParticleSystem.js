import Phaser from 'phaser';

export class SparkParticle {
  constructor(x, y, scene) {
    this.x = x;
    this.y = y;
    this.scene = scene;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.life = 1.0;
    this.decay = 0.02 + Math.random() * 0.03;
    this.size = 2 + Math.random() * 4;
    this.gravity = 0.15;
    
    const colors = [0xffff00, 0xffaa00, 0xff6600, 0xffffff];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    this.life -= this.decay;
    
    return this.life > 0;
  }

  render(graphics) {
    const alpha = this.life;
    const size = this.size * this.life;
    
    graphics.fillStyle(this.color, alpha);
    graphics.beginPath();
    graphics.arc(this.x, this.y, size, 0, Math.PI * 2);
    graphics.closePath();
    graphics.fillPath();
    
    graphics.fillStyle(this.color, alpha * 0.3);
    graphics.beginPath();
    graphics.arc(this.x - this.vx * 0.5, this.y - this.vy * 0.5, size * 0.7, 0, Math.PI * 2);
    graphics.closePath();
    graphics.fillPath();
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 500;
    this.graphics = this.scene.add.graphics();
  }

  createSpark(x, y) {
    const count = 8 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(new SparkParticle(x, y, this.scene));
      }
    }
  }

  createExplosion(x, y, intensity = 1) {
    const count = Math.floor(20 * intensity);
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(new SparkParticle(x, y, this.scene));
      }
    }
  }

  createTrail(x, y) {
    if (this.particles.length < this.maxParticles) {
      const particle = new SparkParticle(x, y, this.scene);
      particle.life = 0.5;
      particle.decay = 0.05;
      particle.size = 1.5;
      this.particles.push(particle);
    }
  }

  update() {
    this.particles = this.particles.filter(particle => particle.update());
  }

  render() {
    this.graphics.clear();
    
    this.particles.forEach(particle => {
      particle.render(this.graphics);
    });
  }

  clear() {
    this.particles = [];
    this.graphics.clear();
  }

  destroy() {
    this.clear();
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}
