import { DeviceModel } from './DeviceModelLibrary';

export interface StackSafetyResult {
  pass: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  message: string;
  detail: string;
  requiresBracket: boolean;
  totalHeight: number;
  combinedWeight: number;
}

export class StackSafetyDetector {
  static MAX_STACK_HEIGHT = 180;
  static MAX_WEIGHT_RATIO = 0.85;

  static check(
    washer: DeviceModel,
    dryer: DeviceModel | null,
    hasBracket: boolean
  ): StackSafetyResult {
    if (!dryer) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '未安装烘干机',
        detail: '无需检测叠放安全性',
        requiresBracket: false,
        totalHeight: washer.dimensions.height,
        combinedWeight: washer.weight
      };
    }

    const totalHeight = washer.dimensions.height + dryer.dimensions.height;
    const combinedWeight = washer.weight + dryer.weight;
    const weightRatio = dryer.weight / washer.weight;

    const issues: string[] = [];

    if (!washer.stackable) {
      issues.push('洗衣机不支持叠放安装');
    }

    if (!dryer.stackable) {
      issues.push('烘干机不支持叠放安装');
    }

    if (washer.stackKitRequired && !hasBracket) {
      issues.push('需加装专用支架，否则存在倾倒风险');
    }

    if (dryer.stackKitRequired && !hasBracket) {
      issues.push('烘干机需要叠放支架');
    }

    if (totalHeight > this.MAX_STACK_HEIGHT) {
      issues.push(`总高度 ${totalHeight}cm 超过推荐最大值 ${this.MAX_STACK_HEIGHT}cm`);
    }

    if (weightRatio > this.MAX_WEIGHT_RATIO) {
      issues.push(`烘干机重量(${dryer.weight}kg)超过洗衣机重量(${washer.weight}kg)的${(this.MAX_WEIGHT_RATIO * 100).toFixed(0)}%，稳定性不足`);
    }

    if (issues.length === 0) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '叠放安装安全',
        detail: `洗衣机(${washer.weight}kg) + 烘干机(${dryer.weight}kg) = ${combinedWeight}kg，总高度 ${totalHeight}cm，叠放安全`,
        requiresBracket: false,
        totalHeight,
        combinedWeight
      };
    } else if (issues.length === 1 && issues[0] === '需加装专用支架，否则存在倾倒风险') {
      return {
        pass: false,
        riskLevel: 'warning',
        message: '需加装专用支架',
        detail: issues.join('；'),
        requiresBracket: true,
        totalHeight,
        combinedWeight
      };
    } else if (issues.length <= 2) {
      return {
        pass: false,
        riskLevel: 'warning',
        message: '叠放安装存在风险',
        detail: issues.join('；'),
        requiresBracket: washer.stackKitRequired || dryer.stackKitRequired,
        totalHeight,
        combinedWeight
      };
    } else {
      return {
        pass: false,
        riskLevel: 'danger',
        message: '叠放安装不安全',
        detail: issues.join('；'),
        requiresBracket: true,
        totalHeight,
        combinedWeight
      };
    }
  }
}
