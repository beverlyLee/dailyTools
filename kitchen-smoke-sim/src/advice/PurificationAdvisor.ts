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

  public getAverageEscapeRate(): number {
    if (this.historicalEscapeRates.length === 0) return 0;
    const sum = this.historicalEscapeRates.reduce((a, b) => a + b, 0);
    return sum / this.historicalEscapeRates.length;
  }

  public generateAdvice(): AdviceItem[] {
    const advice: AdviceItem[] = [];
    const avgEscapeRate = this.getAverageEscapeRate();

    if (avgEscapeRate < 0.1) {
      advice.push({
        type: 'good',
        title: '净化效果优秀',
        description: '油烟逃逸率低于10%，当前配置能有效处理大部分油烟。',
        priority: 1,
      });
    } else if (avgEscapeRate < 0.3) {
      advice.push({
        type: 'info',
        title: '净化效果良好',
        description: '油烟逃逸率在可控范围内，但仍有优化空间。',
        priority: 2,
      });
    } else {
      advice.push({
        type: 'warning',
        title: '净化效果不足',
        description: `油烟逃逸率达到${(avgEscapeRate * 100).toFixed(1)}%，建议立即采取改进措施。`,
        priority: 3,
      });
    }

    if (this.hoodHeight > 0.9 && avgEscapeRate > 0.15) {
      const recommendedHeight = Math.max(0.5, this.hoodHeight - 0.2);
      advice.push({
        type: 'warning',
        title: '建议降低油烟机高度',
        description: `当前安装高度 ${this.hoodHeight.toFixed(2)}m 偏高，建议降至 ${recommendedHeight.toFixed(2)}m 左右，可提升约20%的吸排效率。`,
        priority: 2,
      });
    }

    if (this.suctionPower < 1.5 && avgEscapeRate > 0.2) {
      advice.push({
        type: 'info',
        title: '建议提升油烟机吸力',
        description: '增大油烟机风量档位，可提高油烟捕捉率。注意：过大的风量会产生噪音并增加能耗。',
        priority: 3,
      });
    }

    if (this.windowOpen && avgEscapeRate > 0.15) {
      advice.push({
        type: 'warning',
        title: '开窗影响吸排效果',
        description: '开窗产生的气流会干扰油烟机的气流组织，导致油烟逃逸。建议烹饪时关闭窗户或减少开窗幅度。',
        priority: 2,
      });
    }

    if (avgEscapeRate > 0.25) {
      advice.push({
        type: 'warning',
        title: '建议增加侧吸挡板',
        description: '在油烟机两侧增加侧吸挡板可以形成更好的负压区，有效防止油烟从侧面逃逸，特别适合中式爆炒场景。',
        priority: 2,
      });
    }

    if (this.firePower > 1.5 && avgEscapeRate > 0.2) {
      advice.push({
        type: 'info',
        title: '大火力烹饪建议',
        description: '大火爆炒时油烟量大增，建议提前开启油烟机并调至高档位，烹饪完成后继续运行3-5分钟。',
        priority: 4,
      });
    }

    if (this.stats.depositedCount > 50) {
      advice.push({
        type: 'warning',
        title: '油污沉积较多',
        description: `检测到 ${this.stats.depositedCount} 处油污沉积点，建议定期清洁厨房墙面和橱柜，保持厨房卫生。`,
        priority: 3,
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
