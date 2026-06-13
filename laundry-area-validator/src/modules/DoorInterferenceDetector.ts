import { DeviceModel } from './DeviceModelLibrary';

export interface InterferenceObject {
  type: 'faucet' | 'wall' | 'cabinet' | 'device';
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
}

export interface DoorInterferenceResult {
  pass: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  message: string;
  detail: string;
  interferenceObjects: string[];
}

export class DoorInterferenceDetector {
  static checkWasherDoor(
    washer: DeviceModel,
    washerPosition: { x: number; y: number; z: number },
    faucetPosition: { x: number; y: number; z: number },
    faucetRadius: number,
    balconyWidth: number
  ): DoorInterferenceResult {
    const door = washer.door;
    const doorCenterX = washerPosition.x + washer.dimensions.width;
    const doorCenterY = washerPosition.y + door.hingePosition.y;
    const doorCenterZ = washerPosition.z + washer.dimensions.depth / 2;

    const interferenceObjects: string[] = [];

    const distanceToFaucet = Math.sqrt(
      Math.pow(doorCenterX - faucetPosition.x, 2) +
      Math.pow(doorCenterY - faucetPosition.y, 2) +
      Math.pow(doorCenterZ - faucetPosition.z, 2)
    );

    const minSafeDistance = door.interferenceRadius + faucetRadius;

    if (distanceToFaucet < minSafeDistance) {
      interferenceObjects.push(`进水龙头（距离: ${distanceToFaucet.toFixed(1)}cm，需要: ${minSafeDistance}cm）`);
    }

    const maxX = washerPosition.x + washer.dimensions.width + door.interferenceRadius;
    if (maxX > balconyWidth) {
      interferenceObjects.push(`右侧墙面（超出: ${(maxX - balconyWidth).toFixed(1)}cm）`);
    }

    const minX = washerPosition.x - door.interferenceRadius;
    if (minX < 0) {
      interferenceObjects.push(`左侧墙面（超出: ${Math.abs(minX).toFixed(1)}cm）`);
    }

    if (interferenceObjects.length === 0) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '洗衣机门开启空间充足',
        detail: `洗衣机前门开启角度 ${door.openingAngle}°，周围空间充足，无碰撞风险`,
        interferenceObjects: []
      };
    } else if (interferenceObjects.length === 1) {
      return {
        pass: false,
        riskLevel: 'warning',
        message: '洗衣机门开启受限',
        detail: `洗衣机门开启时可能与以下物体发生干涉: ${interferenceObjects.join(', ')}`,
        interferenceObjects
      };
    } else {
      return {
        pass: false,
        riskLevel: 'danger',
        message: '洗衣机门严重干涉',
        detail: `洗衣机门开启时会与多个物体发生碰撞: ${interferenceObjects.join(', ')}，可能导致门体损坏或无法完全开启`,
        interferenceObjects
      };
    }
  }

  static checkDryerDoor(
    dryer: DeviceModel | null,
    dryerPosition: { x: number; y: number; z: number },
    faucetPosition: { x: number; y: number; z: number },
    faucetRadius: number,
    balconyWidth: number
  ): DoorInterferenceResult {
    if (!dryer) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '未安装烘干机',
        detail: '无需检测烘干机门干涉',
        interferenceObjects: []
      };
    }

    const door = dryer.door;
    const doorCenterX = dryerPosition.x + dryer.dimensions.width;
    const doorCenterY = dryerPosition.y + door.hingePosition.y;
    const doorCenterZ = dryerPosition.z + dryer.dimensions.depth / 2;

    const interferenceObjects: string[] = [];

    const distanceToFaucet = Math.sqrt(
      Math.pow(doorCenterX - faucetPosition.x, 2) +
      Math.pow(doorCenterY - faucetPosition.y, 2) +
      Math.pow(doorCenterZ - faucetPosition.z, 2)
    );

    const minSafeDistance = door.interferenceRadius + faucetRadius;

    if (distanceToFaucet < minSafeDistance) {
      interferenceObjects.push(`进水龙头（距离: ${distanceToFaucet.toFixed(1)}cm，需要: ${minSafeDistance}cm）`);
    }

    const maxX = dryerPosition.x + dryer.dimensions.width + door.interferenceRadius;
    if (maxX > balconyWidth) {
      interferenceObjects.push(`右侧墙面（超出: ${(maxX - balconyWidth).toFixed(1)}cm）`);
    }

    const minX = dryerPosition.x - door.interferenceRadius;
    if (minX < 0) {
      interferenceObjects.push(`左侧墙面（超出: ${Math.abs(minX).toFixed(1)}cm）`);
    }

    if (interferenceObjects.length === 0) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '烘干机门开启空间充足',
        detail: `烘干机前门开启角度 ${door.openingAngle}°，周围空间充足，无碰撞风险`,
        interferenceObjects: []
      };
    } else if (interferenceObjects.length === 1) {
      return {
        pass: false,
        riskLevel: 'warning',
        message: '烘干机门开启受限',
        detail: `烘干机门开启时可能与以下物体发生干涉: ${interferenceObjects.join(', ')}`,
        interferenceObjects
      };
    } else {
      return {
        pass: false,
        riskLevel: 'danger',
        message: '烘干机门严重干涉',
        detail: `烘干机门开启时会与多个物体发生碰撞: ${interferenceObjects.join(', ')}，可能导致门体损坏或无法完全开启`,
        interferenceObjects
      };
    }
  }
}
