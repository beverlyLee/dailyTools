export enum JudgeResult {
  PERFECT = 'perfect',
  GREAT = 'great',
  GOOD = 'good',
  MISS = 'miss',
  NONE = 'none'
}

export interface JudgeConfig {
  perfectWindow: number;
  greatWindow: number;
  goodWindow: number;
  missWindow: number;
}

export interface JudgeResultData {
  result: JudgeResult;
  errorMs: number;
  isEarly: boolean;
}

export interface HitStats {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  totalNotes: number;
  hitNotes: number;
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  perfectWindow: 50,
  greatWindow: 100,
  goodWindow: 150,
  missWindow: 200
};

export class JudgeSystem {
  private config: JudgeConfig;
  private stats: HitStats;

  constructor(config?: Partial<JudgeConfig>) {
    this.config = { ...DEFAULT_JUDGE_CONFIG, ...config };
    this.stats = this.createEmptyStats();
  }

  private createEmptyStats(): HitStats {
    return {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      totalNotes: 0,
      hitNotes: 0
    };
  }

  judge(actualTime: number, expectedTime: number): JudgeResultData {
    const errorMs = actualTime - expectedTime;
    const absErrorMs = Math.abs(errorMs);

    let result: JudgeResult;

    if (absErrorMs <= this.config.perfectWindow) {
      result = JudgeResult.PERFECT;
    } else if (absErrorMs <= this.config.greatWindow) {
      result = JudgeResult.GREAT;
    } else if (absErrorMs <= this.config.goodWindow) {
      result = JudgeResult.GOOD;
    } else if (absErrorMs <= this.config.missWindow) {
      result = JudgeResult.MISS;
    } else {
      result = JudgeResult.NONE;
    }

    return {
      result,
      errorMs: Math.round(errorMs * 1000) / 1000,
      isEarly: errorMs < 0
    };
  }

  judgeAtTime(currentTime: number, noteTime: number, isRelease: boolean = false): JudgeResultData {
    const errorMs = currentTime - noteTime;
    const absErrorMs = Math.abs(errorMs);

    let effectivePerfect = this.config.perfectWindow;
    let effectiveGreat = this.config.greatWindow;
    let effectiveGood = this.config.goodWindow;

    if (isRelease) {
      effectivePerfect *= 1.5;
      effectiveGreat *= 1.5;
      effectiveGood *= 1.5;
    }

    let result: JudgeResult;

    if (absErrorMs <= effectivePerfect) {
      result = JudgeResult.PERFECT;
    } else if (absErrorMs <= effectiveGreat) {
      result = JudgeResult.GREAT;
    } else if (absErrorMs <= effectiveGood) {
      result = JudgeResult.GOOD;
    } else {
      result = JudgeResult.MISS;
    }

    return {
      result,
      errorMs: Math.round(errorMs * 1000) / 1000,
      isEarly: errorMs < 0
    };
  }

  canHit(currentTime: number, noteTime: number): boolean {
    const errorMs = currentTime - noteTime;
    const absErrorMs = Math.abs(errorMs);
    
    return absErrorMs <= this.config.missWindow;
  }

  isTooLate(currentTime: number, noteTime: number): boolean {
    const errorMs = currentTime - noteTime;
    return errorMs > this.config.missWindow;
  }

  getJudgableRange(noteTime: number): { min: number; max: number } {
    return {
      min: noteTime - this.config.missWindow,
      max: noteTime + this.config.missWindow
    };
  }

  processResult(result: JudgeResult): void {
    this.stats.totalNotes++;

    switch (result) {
      case JudgeResult.PERFECT:
        this.stats.perfect++;
        this.stats.hitNotes++;
        this.stats.combo++;
        break;
      case JudgeResult.GREAT:
        this.stats.great++;
        this.stats.hitNotes++;
        this.stats.combo++;
        break;
      case JudgeResult.GOOD:
        this.stats.good++;
        this.stats.hitNotes++;
        this.stats.combo++;
        break;
      case JudgeResult.MISS:
        this.stats.miss++;
        this.stats.combo = 0;
        break;
      case JudgeResult.NONE:
        break;
    }

    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    this.updateAccuracy();
  }

  autoMiss(): void {
    this.processResult(JudgeResult.MISS);
  }

  private updateAccuracy(): void {
    if (this.stats.totalNotes === 0) {
      this.stats.accuracy = 100;
      return;
    }

    const perfectWeight = 100;
    const greatWeight = 75;
    const goodWeight = 50;
    const missWeight = 0;

    const totalWeightedScore = 
      this.stats.perfect * perfectWeight +
      this.stats.great * greatWeight +
      this.stats.good * goodWeight +
      this.stats.miss * missWeight;

    const maxWeightedScore = this.stats.totalNotes * perfectWeight;

    this.stats.accuracy = (totalWeightedScore / maxWeightedScore) * 100;
    this.stats.accuracy = Math.round(this.stats.accuracy * 100) / 100;
  }

  getStats(): HitStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = this.createEmptyStats();
  }

  getConfig(): JudgeConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<JudgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getJudgeTimeWindow(result: JudgeResult): number {
    switch (result) {
      case JudgeResult.PERFECT:
        return this.config.perfectWindow;
      case JudgeResult.GREAT:
        return this.config.greatWindow;
      case JudgeResult.GOOD:
        return this.config.goodWindow;
      case JudgeResult.MISS:
        return this.config.missWindow;
      default:
        return Infinity;
    }
  }

  static getResultScore(result: JudgeResult): number {
    switch (result) {
      case JudgeResult.PERFECT:
        return 1000;
      case JudgeResult.GREAT:
        return 750;
      case JudgeResult.GOOD:
        return 500;
      case JudgeResult.MISS:
        return 0;
      default:
        return 0;
    }
  }

  static getResultColor(result: JudgeResult): string {
    switch (result) {
      case JudgeResult.PERFECT:
        return '#FFD700';
      case JudgeResult.GREAT:
        return '#00FF88';
      case JudgeResult.GOOD:
        return '#00AAFF';
      case JudgeResult.MISS:
        return '#FF4444';
      default:
        return '#FFFFFF';
    }
  }

  static getResultName(result: JudgeResult): string {
    switch (result) {
      case JudgeResult.PERFECT:
        return 'PERFECT';
      case JudgeResult.GREAT:
        return 'GREAT';
      case JudgeResult.GOOD:
        return 'GOOD';
      case JudgeResult.MISS:
        return 'MISS';
      default:
        return '';
    }
  }
}
