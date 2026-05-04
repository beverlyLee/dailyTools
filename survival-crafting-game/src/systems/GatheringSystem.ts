import { Gatherable, GatherableType, Position, Item, Serializable } from '../types';
import { GATHERABLE_TYPES, GAME_CONFIG, ItemType } from '../config';

export class GatheringSystem implements Serializable {
  private gatherables: Gatherable[];
  private gatheringTime: number;

  constructor() {
    this.gatherables = [];
    this.gatheringTime = GAME_CONFIG.gathering.gatheringTime;
  }

  addGatherable(type: GatherableType, position: Position): string {
    const gatherableType = GATHERABLE_TYPES[type];
    const maxHealth = type === 'tree' ? GAME_CONFIG.gathering.treeHealth : GAME_CONFIG.gathering.rockHealth;
    
    const gatherable: Gatherable = {
      id: this.generateId(),
      type,
      position: { ...position },
      health: maxHealth,
      maxHealth,
      isDepleted: false,
      respawnTimer: 0
    };

    this.gatherables.push(gatherable);
    return gatherable.id;
  }

  getGatherable(id: string): Gatherable | null {
    return this.gatherables.find(g => g.id === id) || null;
  }

  getAllGatherables(): Gatherable[] {
    return this.gatherables.map(g => ({ ...g, position: { ...g.position } }));
  }

  gather(id: string, damage: number = 1): Item[] | null {
    const gatherable = this.getGatherable(id);
    if (!gatherable || gatherable.isDepleted) return null;

    gatherable.health -= damage;

    if (gatherable.health <= 0) {
      gatherable.isDepleted = true;
      gatherable.respawnTimer = GATHERABLE_TYPES[gatherable.type].respawnTime;
      return this.generateDrops(gatherable.type);
    }

    return [];
  }

  private generateDrops(type: GatherableType): Item[] {
    const gatherableType = GATHERABLE_TYPES[type];
    const drops: Item[] = [];

    for (const [itemType, [min, max]] of Object.entries(gatherableType.drops)) {
      const quantity = Math.floor(Math.random() * (max - min + 1)) + min;
      if (quantity > 0) {
        drops.push({
          id: this.generateItemId(),
          type: itemType as ItemType,
          quantity
        });
      }
    }

    return drops;
  }

  update(deltaTime: number): void {
    for (const gatherable of this.gatherables) {
      if (gatherable.isDepleted && gatherable.respawnTimer > 0) {
        gatherable.respawnTimer -= deltaTime * 1000;
        if (gatherable.respawnTimer <= 0) {
          gatherable.isDepleted = false;
          gatherable.health = gatherable.maxHealth;
          gatherable.respawnTimer = 0;
        }
      }
    }
  }

  getGatheringTime(): number {
    return this.gatheringTime;
  }

  setGatheringTime(time: number): void {
    this.gatheringTime = time;
  }

  getDistance(position1: Position, position2: Position): number {
    const dx = position2.x - position1.x;
    const dy = position2.y - position1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  findNearbyGatherables(position: Position, radius: number): Gatherable[] {
    return this.gatherables.filter(g => {
      if (g.isDepleted) return false;
      const distance = this.getDistance(position, g.position);
      return distance <= radius;
    });
  }

  private generateId(): string {
    return `gatherable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  serialize(): string {
    return JSON.stringify({
      gatherables: this.gatherables.map(g => ({ ...g, position: { ...g.position } })),
      gatheringTime: this.gatheringTime
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.gatherables = parsed.gatherables || [];
      this.gatheringTime = parsed.gatheringTime || GAME_CONFIG.gathering.gatheringTime;
    } catch (error) {
      console.error('Failed to deserialize GatheringSystem:', error);
    }
  }
}
