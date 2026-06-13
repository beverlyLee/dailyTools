import { DeviceModel } from './DeviceModelLibrary';

export interface HeatVentilationResult {
  pass: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  message: string;
  detail: string;
  actualDistance: number;
  requiredDistance: number;
}

export class HeatVentilationDetector {
  static MIN_REQUIRED_DISTANCE = 10;

  static check(dryer: DeviceModel | null, distanceToBackWall: number): HeatVentilationResult {
    if (!dryer) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '未安装烘干机',
        detail: '无需检测散热空间',
        actualDistance: 0,
        requiredDistance: 0
      };
    }

    const requiredDistance = dryer.ventilation?.minBackDistance || HeatVentilationDetector.MIN_REQUIRED_DISTANCE;
    const actualDistance = distanceToBackWall;

    if (actualDistance >= requiredDistance) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '散热空间检测通过',
        detail: `烘干机背部与墙面距离 ${actualDistance}cm，满足最小要求 ${requiredDistance}cm`,
        actualDistance,
        requiredDistance
      };
    } else if (actualDistance >= requiredDistance * 0.7) {
      const deficit = requiredDistance - actualDistance;
      return {
        pass: false,
        riskLevel: 'warning',
        message: '散热空间不足',
        detail: `烘干机背部与墙面距离 ${actualDistance}cm，低于推荐值 ${requiredDistance}cm，建议增加 ${deficit.toFixed(1)}cm 空间以保证散热效果`,
        actualDistance,
        requiredDistance
      };
    } else {
      const deficit = requiredDistance - actualDistance;
      return {
        pass: false,
        riskLevel: 'danger',
        message: '过热风险',
        detail: `烘干机背部与墙面距离仅 ${actualDistance}cm，远低于最小要求 ${requiredDistance}cm，差距 ${deficit.toFixed(1)}cm，存在过热风险，可能导致设备损坏或火灾隐患`,
        actualDistance,
        requiredDistance
      };
    }
  }
}
