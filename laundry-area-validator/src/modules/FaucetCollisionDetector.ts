import { DeviceModel } from './DeviceModelLibrary';

export interface FaucetCollisionResult {
  pass: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  message: string;
  detail: string;
  minDistance: number;
  safeDistance: number;
}

export class FaucetCollisionDetector {
  static SAFE_DISTANCE = 10;

  static check(
    washer: DeviceModel,
    washerPosition: { x: number; y: number; z: number },
    faucetPosition: { x: number; y: number; z: number },
    faucetRadius: number,
    dryer: DeviceModel | null = null,
    dryerPosition?: { x: number; y: number; z: number }
  ): FaucetCollisionResult {
    const washerFrontX = washerPosition.x + washer.dimensions.width;

    const distanceX = Math.abs(faucetPosition.x - washerFrontX);
    const distanceZ = Math.abs(faucetPosition.z - (washerPosition.z + washer.dimensions.depth / 2));

    let minDistance = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);

    const totalSafeDistance = faucetRadius + this.SAFE_DISTANCE;

    if (minDistance >= totalSafeDistance) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '进水龙头位置安全',
        detail: `龙头与洗衣机前部距离 ${minDistance.toFixed(1)}cm，满足安全距离要求（${totalSafeDistance}cm）`,
        minDistance,
        safeDistance: totalSafeDistance
      };
    }

    let collisionSource = '洗衣机';

    if (dryer && dryerPosition) {
      const dryerFrontX = dryerPosition.x + dryer.dimensions.width;

      const dryerDistanceX = Math.abs(faucetPosition.x - dryerFrontX);
      const dryerDistanceZ = Math.abs(faucetPosition.z - (dryerPosition.z + dryer.dimensions.depth / 2));

      const dryerMinDistance = Math.sqrt(dryerDistanceX * dryerDistanceX + dryerDistanceZ * dryerDistanceZ);

      if (dryerMinDistance < minDistance) {
        minDistance = dryerMinDistance;
        collisionSource = '烘干机';
      }
    }

    if (minDistance >= totalSafeDistance * 0.7) {
      const deficit = totalSafeDistance - minDistance;
      return {
        pass: false,
        riskLevel: 'warning',
        message: '龙头与设备距离较近',
        detail: `${collisionSource}与进水龙头距离 ${minDistance.toFixed(1)}cm，建议增加 ${deficit.toFixed(1)}cm 空间，避免开门或维护时碰撞`,
        minDistance,
        safeDistance: totalSafeDistance
      };
    } else {
      const deficit = totalSafeDistance - minDistance;
      return {
        pass: false,
        riskLevel: 'danger',
        message: '龙头碰撞风险',
        detail: `${collisionSource}与进水龙头距离仅 ${minDistance.toFixed(1)}cm，差距 ${deficit.toFixed(1)}cm，存在碰撞损坏风险，建议调整龙头位置或设备布局`,
        minDistance,
        safeDistance: totalSafeDistance
      };
    }
  }
}
