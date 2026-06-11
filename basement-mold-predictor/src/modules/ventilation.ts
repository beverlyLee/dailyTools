import type { VentilationConfig, EnvironmentParams } from './types';

export interface VentilationParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'air' | 'moisture';
}

export interface AirflowPoint {
  x: number;
  y: number;
  z: number;
  velocity: number;
  direction: { x: number; y: number; z: number };
}

export class VentilationSimulator {
  private particles: VentilationParticle[] = [];
  private airflowField: AirflowPoint[] = [];
  private particleCount: number = 300;
  private airflowResolution: { x: number; y: number } = { x: 20, y: 15 };

  constructor(
    private ventilation: VentilationConfig,
    private env: EnvironmentParams
  ) {
    this.buildAirflowField();
  }

  private buildAirflowField() {
    this.airflowField = [];
    for (let i = 0; i < this.airflowResolution.x; i++) {
      for (let j = 0; j < this.airflowResolution.y; j++) {
        const x = i / (this.airflowResolution.x - 1);
        const y = j / (this.airflowResolution.y - 1);
        const z = -0.5;

        const { velocity } = this.calculateAirflowAtPoint(x, y, z);
        this.airflowField.push({
          x,
          y,
          z,
          velocity,
          direction: { x: 1, y: 0, z: 0 },
        });
      }
    }
  }

  calculateAirflowAtPoint(x: number, y: number, z: number): { velocity: number; direction: { x: number; y: number; z: number } } {
    if (!this.ventilation.enabled) {
      return { velocity: 0, direction: { x: 0, y: 0, z: 0 } };
    }

    const intensity = this.ventilation.intensity;
    const baseVelocity = 0.5 + intensity * 0.5;

    const wallAttraction = -Math.exp(-z * 4) * 0.3;
    const zFlow = wallAttraction;

    const swirl = Math.sin(x * 6 + y * 4) * 0.2;

    return {
      velocity: baseVelocity * (0.5 + 0.5 * Math.sin(x * 2 + y * 1.5)),
      direction: { x: 0.8 + swirl, y: 0.1 + Math.cos(x * 3) * 0.1, z: zFlow },
    };
  }

  getMoistureReduction(): number {
    if (!this.ventilation.enabled) return 0;
    return this.ventilation.intensity * 0.15;
  }

  getDewDurationReduction(): number {
    if (!this.ventilation.enabled) return 0;
    const baseReduction = this.ventilation.intensity * 0.2;
    const humidityFactor = Math.min(1, this.env.outdoorHumidity / 90);
    return baseReduction * humidityFactor;
  }

  spawnParticles(): VentilationParticle[] {
    const newParticles: VentilationParticle[] = [];
    if (!this.ventilation.enabled) return newParticles;

    const spawnCount = this.ventilation.intensity * 3;
    for (let i = 0; i < spawnCount; i++) {
      if (this.particles.length >= this.particleCount) break;

      const isMoisture = Math.random() > 0.5;
      const particle: VentilationParticle = {
        x: -0.8 + Math.random() * 0.3,
        y: 0.3 + Math.random() * 0.6,
        z: -0.8 + Math.random() * 0.4,
        vx: 0.01 + Math.random() * 0.02,
        vy: (Math.random() - 0.5) * 0.005,
        vz: (Math.random() - 0.5) * 0.01,
        size: isMoisture ? 0.015 + Math.random() * 0.02 : 0.008 + Math.random() * 0.012,
        opacity: isMoisture ? 0.7 : 0.35,
        life: 1,
        maxLife: 200 + Math.random() * 200,
        type: isMoisture ? 'moisture' : 'air',
      };
      newParticles.push(particle);
      this.particles.push(particle);
    }

    return newParticles;
  }

  updateParticles(deltaTime: number): VentilationParticle[] {
    const dt = Math.min(deltaTime, 0.05) * 60;
    const deadParticles: VentilationParticle[] = [];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      const { velocity, direction } = this.calculateAirflowAtPoint(p.x, p.y, p.z);
      p.vx += direction.x * 0.0003 * velocity * dt;
      p.vy += direction.y * 0.0003 * velocity * dt;
      p.vz += direction.z * 0.0003 * velocity * dt;

      p.vy += 0.00002 * dt;

      const damping = 0.995;
      p.vx *= damping;
      p.vy *= damping;
      p.vz *= damping;

      const maxSpeed = 0.05;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
        p.vz = (p.vz / speed) * maxSpeed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy) * 0.3;
      }
      if (p.y > 1) {
        p.y = 1;
        p.vy = -Math.abs(p.vy) * 0.3;
      }
      if (p.z > 0.01) {
        p.z = 0.01;
        p.vz = -Math.abs(p.vz) * 0.5;
      }
      if (p.z < -1) {
        p.z = -1;
        p.vz = Math.abs(p.vz) * 0.3;
      }

      p.life -= dt * 0.004;
      p.opacity = Math.max(0, p.opacity * (p.life / p.maxLife));

      if (p.life <= 0 || p.x > 1.2) {
        deadParticles.push(p);
        this.particles.splice(i, 1);
      }
    }

    return deadParticles;
  }

  getParticles(): VentilationParticle[] {
    return this.particles;
  }

  getActiveParticleCount(): number {
    return this.particles.length;
  }

  getVentilationAdvice(): {
    recommendation: string;
    duration: string;
    schedule: string;
  } {
    const humidity = this.env.outdoorHumidity;
    const intensity = this.ventilation.intensity;

    let recommendation = '';
    let duration = '';
    let schedule = '';

    if (humidity < 70) {
      recommendation = '当前湿度较低，自然通风即可';
      duration = '每日 2-3 次，每次 30 分钟';
      schedule = '建议在上午 10:00 及下午 15:00';
    } else if (humidity < 85) {
      if (intensity < 2) {
        recommendation = '建议开启中等强度机械通风';
        duration = '每日累计 4-6 小时';
        schedule = '分时段运行，避开室外高湿度时段';
      } else {
        recommendation = '当前通风强度充足，持续保持';
        duration = '连续运行 6-8 小时/天';
        schedule = '可设置定时模式节省能耗';
      }
    } else {
      if (intensity < 3) {
        recommendation = '⚠️ 高湿度警报！请开启最大强度通风';
        duration = '建议 24 小时连续运行';
        schedule = '配合除湿机使用效果更佳';
      } else {
        recommendation = '高湿度环境已开启强力通风，建议配合除湿';
        duration = '连续运行，每 2 小时检查一次';
        schedule = '可设置湿度传感器自动控制';
      }
    }

    return { recommendation, duration, schedule };
  }

  update(ventilation?: VentilationConfig, env?: EnvironmentParams) {
    if (ventilation) this.ventilation = ventilation;
    if (env) this.env = env;
  }

  reset() {
    this.particles = [];
    this.buildAirflowField();
  }
}
