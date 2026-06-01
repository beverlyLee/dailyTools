import * as THREE from 'three';
import { RockFormation } from '../terrain/RockFormation';

export type WindDirection = 'left' | 'right' | 'front' | 'back';

export interface ErosionStats {
  totalDisplacement: number;
  windwardVertexCount: number;
  erosionTime: number;
  isEroding: boolean;
}

export type ErosionEventHandler = (stoppedByLimit?: boolean) => void;

export class WindErosion {
  public windDirection: THREE.Vector3;
  public windSpeed: number = 1.0;
  public erosionStrength: number = 1.0;
  public isEroding: boolean = false;

  private rock: RockFormation;
  private totalDisplacement: number = 0;
  private erosionTime: number = 0;
  private lastWindwardCount: number = 0;

  private readonly MAX_FRAME_DISPLACEMENT = 0.003;
  private readonly MAX_TOTAL_DISPLACEMENT = 2.5;
  private readonly TARGET_FRAMES = 300;
  private readonly FRAME_BUDGET = this.MAX_TOTAL_DISPLACEMENT / this.TARGET_FRAMES;
  private readonly WEIGHT_COMPENSATION = 120.0;

  private onErosionStop: ErosionEventHandler | null = null;

  private tempPos: THREE.Vector3;
  private tempNormal: THREE.Vector3;
  private tempDisplacement: THREE.Vector3;

  private directionMap: Record<WindDirection, THREE.Vector3> = {
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    front: new THREE.Vector3(0, 0, -1),
    back: new THREE.Vector3(0, 0, 1),
  };

  private currentDirectionKey: WindDirection = 'left';

  constructor(rock: RockFormation) {
    this.rock = rock;
    this.windDirection = new THREE.Vector3(-1, 0, 0);
    this.tempPos = new THREE.Vector3();
    this.tempNormal = new THREE.Vector3();
    this.tempDisplacement = new THREE.Vector3();
  }

  public setOnErosionStop(handler: ErosionEventHandler | null): void {
    this.onErosionStop = handler;
  }

  public setDirection(direction: WindDirection): void {
    this.currentDirectionKey = direction;
    this.windDirection.copy(this.directionMap[direction]);
    this.windDirection.normalize();
  }

  public getDirectionKey(): WindDirection {
    return this.currentDirectionKey;
  }

  public getDirectionLabel(): string {
    const labels: Record<WindDirection, string> = {
      left: '← 左',
      right: '右 →',
      front: '前',
      back: '后',
    };
    return labels[this.currentDirectionKey];
  }

  public start(): void {
    this.isEroding = true;
  }

  public stop(): void {
    this.isEroding = false;
  }

  public toggle(): boolean {
    this.isEroding = !this.isEroding;
    return this.isEroding;
  }

  public reset(): void {
    this.isEroding = false;
    this.totalDisplacement = 0;
    this.erosionTime = 0;
    this.lastWindwardCount = 0;
    this.rock.reset();
  }

  public update(deltaTime: number): void {
    if (!this.isEroding) return;

    this.erosionTime += deltaTime;

    if (this.totalDisplacement >= this.MAX_TOTAL_DISPLACEMENT) {
      this.isEroding = false;
      if (this.onErosionStop) {
        this.onErosionStop(true);
      }
      return;
    }

    const totalVertices = this.rock.vertexCount;
    const remainingBudget = this.MAX_TOTAL_DISPLACEMENT - this.totalDisplacement;
    const frameBudget = Math.min(this.FRAME_BUDGET * this.windSpeed * this.erosionStrength, remainingBudget);

    interface WindwardVertex {
      index: number;
      weight: number;
    }
    const windwardVertices: WindwardVertex[] = [];
    let totalWeight = 0;
    let windwardCount = 0;

    const positionAttr = this.rock.geometry.attributes.position;
    const positions = positionAttr.array as Float32Array;
    const colors = this.rock.geometry.attributes.color.array as Float32Array;
    const rockCenterY = this.rock.mesh.position.y;
    const halfHeight = this.rock.baseRadius;

    for (let i = 0; i < totalVertices; i++) {
      this.rock.getVertexPosition(i, this.tempPos);
      this.rock.getVertexNormal(i, this.tempNormal);

      const erosionFactor = this.tempNormal.dot(this.windDirection);

      if (erosionFactor > 0) {
        windwardCount++;

        const curvedErosion = Math.pow(erosionFactor, 1.5);

        const relativeY = (this.tempPos.y - rockCenterY + halfHeight) / (2 * halfHeight);
        const clampedY = Math.max(0, Math.min(1, relativeY));

        let heightMod: number;
        if (clampedY < 0.25) {
          heightMod = 0.15 + clampedY * 2.8;
        } else if (clampedY < 0.75) {
          heightMod = 0.85 + (clampedY - 0.25) * 0.6;
        } else {
          heightMod = 1.15 - (clampedY - 0.75) * 1.4;
        }

        const weight = curvedErosion * heightMod;
        totalWeight += weight;
        windwardVertices.push({ index: i, weight });
      }
    }

    let frameDisplacement = 0;

    if (totalWeight > 0 && frameBudget > 0) {
      const displacementPerWeight = (frameBudget / totalWeight) * this.WEIGHT_COMPENSATION;

      for (const { index, weight } of windwardVertices) {
        this.rock.getVertexPosition(index, this.tempPos);
        this.rock.getVertexNormal(index, this.tempNormal);

        let displacementAmount = weight * displacementPerWeight;
        displacementAmount = Math.min(displacementAmount, this.MAX_FRAME_DISPLACEMENT);

        const remaining = remainingBudget - frameDisplacement;
        if (displacementAmount > remaining) {
          displacementAmount = Math.max(0, remaining);
        }

        if (displacementAmount <= 0) continue;

        this.tempDisplacement
          .copy(this.tempNormal)
          .multiplyScalar(-displacementAmount);

        this.tempPos.add(this.tempDisplacement);

        const idx = index * 3;
        positions[idx] = this.tempPos.x;
        positions[idx + 1] = this.tempPos.y;
        positions[idx + 2] = this.tempPos.z;

        const lightenFactor = displacementAmount * 8;
        colors[idx] = Math.min(1.0, colors[idx] + lightenFactor * 0.25);
        colors[idx + 1] = Math.min(1.0, colors[idx + 1] + lightenFactor * 0.2);
        colors[idx + 2] = Math.min(1.0, colors[idx + 2] + lightenFactor * 0.15);

        frameDisplacement += displacementAmount;
      }
    }

    this.totalDisplacement += frameDisplacement;
    this.lastWindwardCount = windwardCount;

    this.rock.geometry.attributes.color.needsUpdate = true;
    this.rock.updatePositions();
  }

  public getStats(): ErosionStats {
    return {
      totalDisplacement: this.totalDisplacement,
      windwardVertexCount: this.lastWindwardCount,
      erosionTime: this.erosionTime,
      isEroding: this.isEroding,
    };
  }

  public getWindDirection(): THREE.Vector3 {
    return this.windDirection.clone();
  }
}
