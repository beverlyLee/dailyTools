export interface SimulationStats {
  totalEmitted: number;
  capturedCount: number;
  escapedCount: number;
  depositedCount: number;
  escapeRate: number;
  captureRate: number;
}

export interface AdviceItem {
  type: 'warning' | 'info' | 'good';
  title: string;
  description: string;
  priority: number;
}

export class PurificationAdvisor {
  private stats: SimulationStats;
  private hoodHeight: number;
  private suctionPower: number;
  private windowOpen: boolean;
  private firePower: number;
  private hoodOn: boolean;
  private historicalEscapeRates: number[] = [];
  private maxHistory = 60;

  constructor() {
    this.stats = {
      totalEmitted: 0,
      capturedCount: 0,
      escapedCount: 0,
      depositedCount: 0,
      escapeRate: 0,
      captureRate: 0,
    };
    this.hoodHeight = 0.75;
    this.suctionPower = 1.5;
    this.windowOpen = false;
    this.firePower = 1;
    this.hoodOn = true;
  }

  public updateStats(
    totalEmitted: number,
    captured: number,
    escaped: number,
    deposited: number
  ): void {
    this.stats.totalEmitted = totalEmitted;
    this.stats.capturedCount = captured;
    this.stats.escapedCount = escaped;
    this.stats.depositedCount = deposited;

    const total = captured + escaped + deposited;
    if (total > 0) {
      this.stats.escapeRate = (escaped + deposited) / total;
      this.stats.captureRate = captured / total;
    }

    this.historicalEscapeRates.push(this.stats.escapeRate);
    if (this.historicalEscapeRates.length > this.maxHistory) {
      this.historicalEscapeRates.shift();
    }
  }

  public setHoodHeight(height: number): void {
    this.hoodHeight = height;
  }

  public setSuctionPower(power: number): void {
    this.suctionPower = power;
  }

  public setWindowOpen(open: boolean): void {
    this.windowOpen = open;
  }

  public setFirePower(power: number): void {
    this.firePower = power;
  }

  public setHoodOn(on: boolean): void {
    this.hoodOn = on;
  }

  public getAverageEscapeRate(): number {
    if (this.historicalEscapeRates.length === 0) return 0;
    const sum = this.historicalEscapeRates.reduce((a, b) => a + b, 0);
    return sum / this.historicalEscapeRates.length;
  }

  public generateAdvice(): AdviceItem[] {
    const advice: AdviceItem[] = [];
    const avgEscapeRate = this.getAverageEscapeRate();

    if (!this.hoodOn) {
      advice.push({
        type: 'warning',
        title: '请开启油烟机',
        description: '油烟机未开启时，油烟会迅速弥漫整个厨房，墙面和橱柜会积累大量油污。建议立即开启油烟机进行排烟。',
        priority: 1,
      });

      advice.push({
        type: 'info',
        title: '烹饪健康提示',
        description: '长期吸入未经过滤的厨房油烟会增加健康风险，建议养成"先开油烟机再开火"的好习惯。',
        priority: 5,
      });

      return advice;
    }

    if (avgEscapeRate < 0.08) {
      advice.push({
        type: 'good',
        title: '净化效果优秀',
        description: '油烟逃逸率低于8%，当前配置能高效处理油烟，厨房空气质量良好。',
        priority: 1,
      });
    } else if (avgEscapeRate < 0.2) {
      advice.push({
        type: 'info',
        title: '净化效果良好',
        description: `油烟逃逸率约${(avgEscapeRate * 100).toFixed(1)}%，大部分油烟已被有效吸排。`,
        priority: 2,
      });
    } else {
      advice.push({
        type: 'warning',
        title: '净化效果不足',
        description: `油烟逃逸率达到${(avgEscapeRate * 100).toFixed(1)}%，建议采取改进措施以提升吸排效果。`,
        priority: 2,
      });
    }

    if (this.hoodHeight > 0.85 && avgEscapeRate > 0.12) {
      const recommendedHeight = Math.max(0.45, this.hoodHeight - 0.25);
      const efficiencyGain = Math.round((this.hoodHeight - recommendedHeight) * 30);
      advice.push({
        type: 'warning',
        title: '建议降低油烟机安装高度',
        description: `当前安装高度 ${this.hoodHeight.toFixed(2)}m 偏高，建议降至 ${recommendedHeight.toFixed(2)}m 左右，可提升约${efficiencyGain}%的吸排效率。通常距离灶面65-75cm为最佳高度。`,
        priority: 2,
      });
    }

    if (this.suctionPower < 1.2 && avgEscapeRate > 0.15) {
      advice.push({
        type: 'info',
        title: '建议提升油烟机风量',
        description: '当前吸力档位偏低，建议调至中高档位以提升油烟捕捉率。爆炒时应使用最大风量。',
        priority: 3,
      });
    }

    if (this.windowOpen && avgEscapeRate > 0.1) {
      advice.push({
        type: 'warning',
        title: '开窗影响吸排效果',
        description: '开窗产生的横向气流会破坏油烟机的负压区，导致大量油烟逃逸。建议烹饪时关闭窗户，或仅留极小缝隙。',
        priority: 2,
      });
    }

    if (avgEscapeRate > 0.3) {
      advice.push({
        type: 'warning',
        title: '建议加装侧吸挡板',
        description: '在油烟机两侧增加侧吸挡板可以有效收拢油烟，形成更稳定的负压区，特别适合中式大火爆炒场景，可显著降低逃逸率。',
        priority: 3,
      });
    }

    if (this.firePower > 1.4 && avgEscapeRate > 0.15) {
      advice.push({
        type: 'info',
        title: '大火力烹饪建议',
        description: '爆炒时油烟量大幅增加，建议提前1-2分钟开启油烟机并调至最大档位，烹饪结束后继续运行3-5分钟以彻底排净余烟。',
        priority: 4,
      });
    }

    if (this.stats.depositedCount > 80) {
      advice.push({
        type: 'warning',
        title: '油污沉积较多',
        description: `检测到 ${this.stats.depositedCount} 处油污沉积点，建议定期清洁厨房墙面、台面和橱柜，避免油污长期积累难以清理。`,
        priority: 4,
      });
    }

    if (avgEscapeRate > 0.15 && this.hoodHeight <= 0.6 && this.suctionPower >= 1.8) {
      advice.push({
        type: 'info',
        title: '建议更换大吸力油烟机',
        description: '当前配置下逃逸率仍较高，可能是油烟机风量不足。建议更换风量18m³/min以上、风压300Pa以上的大吸力油烟机。',
        priority: 4,
      });
    }

    return advice.sort((a, b) => a.priority - b.priority);
  }

  public getSummaryText(): string {
    const advice = this.generateAdvice();
    const avgEscapeRate = this.getAverageEscapeRate();

    if (advice.length === 0 || avgEscapeRate < 0.05) {
      return '当前厨房空气净化状况良好，油烟逃逸率低，继续保持当前配置即可。';
    }

    const topAdvice = advice.find(a => a.priority <= 2) || advice[0];
    return topAdvice.description;
  }

  public getAdviceLevel(): 'good' | 'warning' | 'info' {
    const avgEscapeRate = this.getAverageEscapeRate();
    if (avgEscapeRate < 0.1) return 'good';
    if (avgEscapeRate > 0.3) return 'warning';
    return 'info';
  }

  public getStats(): SimulationStats {
    return { ...this.stats };
  }

  public reset(): void {
    this.stats = {
      totalEmitted: 0,
      capturedCount: 0,
      escapedCount: 0,
      depositedCount: 0,
      escapeRate: 0,
      captureRate: 0,
    };
    this.historicalEscapeRates = [];
  }
}
