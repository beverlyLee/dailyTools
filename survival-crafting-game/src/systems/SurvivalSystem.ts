import { SurvivalStats, SurvivalConfig, Serializable } from '../types';
import { GAME_CONFIG } from '../config';

export class SurvivalSystem implements Serializable {
  private stats: SurvivalStats;
  private config: SurvivalConfig;
  private lastUpdateTime: number;

  constructor(config?: Partial<SurvivalConfig>) {
    this.config = {
      hungerDecayRate: GAME_CONFIG.survival.hungerDecayRate,
      thirstDecayRate: GAME_CONFIG.survival.thirstDecayRate,
      healthDecayRate: GAME_CONFIG.survival.healthDecayRate,
      hungerRegenRate: GAME_CONFIG.survival.hungerRegenRate,
      healthRegenRate: GAME_CONFIG.survival.healthRegenRate,
      ...config
    };

    this.stats = {
      hunger: GAME_CONFIG.survival.maxHunger,
      thirst: GAME_CONFIG.survival.maxThirst,
      health: GAME_CONFIG.survival.maxHealth,
      maxHunger: GAME_CONFIG.survival.maxHunger,
      maxThirst: GAME_CONFIG.survival.maxThirst,
      maxHealth: GAME_CONFIG.survival.maxHealth,
      isAlive: true
    };

    this.lastUpdateTime = Date.now();
  }

  getStats(): SurvivalStats {
    return { ...this.stats };
  }

  update(): void {
    if (!this.stats.isAlive) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    this.decayStats(deltaTime);
    this.checkStatus();
  }

  private decayStats(deltaTime: number): void {
    this.stats.hunger = Math.max(0, this.stats.hunger - this.config.hungerDecayRate * deltaTime);
    this.stats.thirst = Math.max(0, this.stats.thirst - this.config.thirstDecayRate * deltaTime);

    if (this.stats.hunger <= 0 || this.stats.thirst <= 0) {
      this.stats.health = Math.max(0, this.stats.health - this.config.healthDecayRate * deltaTime);
    } else if (this.stats.hunger > 50 && this.stats.thirst > 50) {
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + this.config.healthRegenRate * deltaTime);
    }
  }

  private checkStatus(): void {
    if (this.stats.health <= 0) {
      this.stats.isAlive = false;
    }
  }

  consumeHunger(amount: number): void {
    if (!this.stats.isAlive) return;
    this.stats.hunger = Math.min(this.stats.maxHunger, this.stats.hunger + amount);
  }

  consumeThirst(amount: number): void {
    if (!this.stats.isAlive) return;
    this.stats.thirst = Math.min(this.stats.maxThirst, this.stats.thirst + amount);
  }

  heal(amount: number): void {
    if (!this.stats.isAlive) return;
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  takeDamage(amount: number): void {
    if (!this.stats.isAlive) return;
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.checkStatus();
  }

  revive(): void {
    this.stats.hunger = this.stats.maxHunger;
    this.stats.thirst = this.stats.maxThirst;
    this.stats.health = this.stats.maxHealth;
    this.stats.isAlive = true;
    this.lastUpdateTime = Date.now();
  }

  setConfig(config: Partial<SurvivalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SurvivalConfig {
    return { ...this.config };
  }

  getHungerPercentage(): number {
    return (this.stats.hunger / this.stats.maxHunger) * 100;
  }

  getThirstPercentage(): number {
    return (this.stats.thirst / this.stats.maxThirst) * 100;
  }

  getHealthPercentage(): number {
    return (this.stats.health / this.stats.maxHealth) * 100;
  }

  serialize(): string {
    return JSON.stringify({
      stats: this.stats,
      config: this.config,
      lastUpdateTime: this.lastUpdateTime
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.stats = parsed.stats || this.stats;
      this.config = parsed.config || this.config;
      this.lastUpdateTime = parsed.lastUpdateTime || Date.now();
    } catch (error) {
      console.error('Failed to deserialize SurvivalSystem:', error);
    }
  }
}
