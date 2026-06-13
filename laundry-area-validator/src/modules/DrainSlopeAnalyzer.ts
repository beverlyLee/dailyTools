export interface DrainSlopeResult {
  pass: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  message: string;
  detail: string;
  slopePercentage: number;
  requiredSlope: number;
  hasProperSlope: boolean;
}

export class DrainSlopeAnalyzer {
  static MIN_REQUIRED_SLOPE = 1.5;
  static RECOMMENDED_SLOPE = 2.0;
  static MAX_ALLOWED_SLOPE = 4.0;

  static analyze(
    balconyWidth: number,
    balconyDepth: number,
    drainPosition: { x: number; z: number },
    washerPosition: { x: number; z: number },
    washerDimensions: { width: number; depth: number },
    dryerPosition?: { x: number; z: number },
    dryerDimensions?: { width: number; depth: number }
  ): DrainSlopeResult {
    const maxDistanceToDrain = Math.max(
      this.calculateDistance(0, 0, drainPosition.x, drainPosition.z),
      this.calculateDistance(balconyWidth, 0, drainPosition.x, drainPosition.z),
      this.calculateDistance(0, balconyDepth, drainPosition.x, drainPosition.z),
      this.calculateDistance(balconyWidth, balconyDepth, drainPosition.x, drainPosition.z)
    );

    const requiredHeightDiff = maxDistanceToDrain * (this.MIN_REQUIRED_SLOPE / 100);

    const washerDrainDistance = this.calculateDistance(
      washerPosition.x + washerDimensions.width / 2,
      washerPosition.z + washerDimensions.depth / 2,
      drainPosition.x,
      drainPosition.z
    );

    let dryerDrainDistance = 0;
    if (dryerPosition && dryerDimensions) {
      dryerDrainDistance = this.calculateDistance(
        dryerPosition.x + dryerDimensions.width / 2,
        dryerPosition.z + dryerDimensions.depth / 2,
        drainPosition.x,
        drainPosition.z
      );
    }

    const maxApplianceDistance = Math.max(washerDrainDistance, dryerDrainDistance);
    const requiredSlopeForAppliance = (requiredHeightDiff / maxDistanceToDrain) * 100;

    const hasProperSlope = maxApplianceDistance <= maxDistanceToDrain * 0.95;

    if (hasProperSlope && requiredSlopeForAppliance >= this.MIN_REQUIRED_SLOPE) {
      return {
        pass: true,
        riskLevel: 'safe',
        message: '地漏坡度检测通过',
        detail: `阳台最大排水距离 ${maxDistanceToDrain.toFixed(1)}cm，设备区域距离地漏 ${maxApplianceDistance.toFixed(1)}cm，所需坡度 ${requiredSlopeForAppliance.toFixed(1)}%，满足排水要求`,
        slopePercentage: requiredSlopeForAppliance,
        requiredSlope: this.MIN_REQUIRED_SLOPE,
        hasProperSlope: true
      };
    } else if (requiredSlopeForAppliance >= this.MIN_REQUIRED_SLOPE * 0.8) {
      return {
        pass: false,
        riskLevel: 'warning',
        message: '地漏位置建议调整',
        detail: `设备区域距离地漏 ${maxApplianceDistance.toFixed(1)}cm，建议将地漏移至更靠近设备的位置以优化排水效果`,
        slopePercentage: requiredSlopeForAppliance,
        requiredSlope: this.MIN_REQUIRED_SLOPE,
        hasProperSlope: false
      };
    } else {
      return {
        pass: false,
        riskLevel: 'danger',
        message: '积水风险',
        detail: `设备区域距离地漏过远（${maxApplianceDistance.toFixed(1)}cm），若地面坡度不足${this.MIN_REQUIRED_SLOPE}%，可能导致积水无法排出，存在漏水隐患`,
        slopePercentage: requiredSlopeForAppliance,
        requiredSlope: this.MIN_REQUIRED_SLOPE,
        hasProperSlope: false
      };
    }
  }

  private static calculateDistance(x1: number, z1: number, x2: number, z2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
  }
}
