import { JudgeResult, HitStats } from './JudgeSystem';

export interface ScoreBreakdown {
  baseScore: number;
  comboBonus: number;
  totalScore: number;
}

export class ScoreSystem {
  private score: number = 0;
  private comboMultiplier: number = 1;
  private readonly BASE_NOTE_SCORE = 1000;
  private readonly COMBO_THRESHOLDS = [10, 20, 30, 50, 70, 100, 150, 200, 300, 500];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.score = 0;
    this.comboMultiplier = 1;
  }

  calculateScore(result: JudgeResult, combo: number): ScoreBreakdown {
    const baseScore = this.getBaseScore(result);
    const comboBonus = this.calculateComboBonus(combo, baseScore);
    const totalScore = baseScore + comboBonus;

    return {
      baseScore,
      comboBonus,
      totalScore
    };
  }

  addScore(result: JudgeResult, combo: number): number {
    const breakdown = this.calculateScore(result, combo);
    this.score += breakdown.totalScore;
    return this.score;
  }

  getBaseScore(result: JudgeResult): number {
    switch (result) {
      case JudgeResult.PERFECT:
        return this.BASE_NOTE_SCORE;
      case JudgeResult.GREAT:
        return Math.floor(this.BASE_NOTE_SCORE * 0.75);
      case JudgeResult.GOOD:
        return Math.floor(this.BASE_NOTE_SCORE * 0.5);
      case JudgeResult.MISS:
        return 0;
      default:
        return 0;
    }
  }

  calculateComboBonus(combo: number, baseScore: number): number {
    if (combo < 10) {
      return 0;
    }

    const bonusPercentage = this.getComboBonusPercentage(combo);
    return Math.floor(baseScore * bonusPercentage);
  }

  private getComboBonusPercentage(combo: number): number {
    let percentage = 0;

    for (const threshold of this.COMBO_THRESHOLDS) {
      if (combo >= threshold) {
        percentage += 0.1;
      } else {
        break;
      }
    }

    return Math.min(percentage, 1.0);
  }

  getComboMultiplier(): number {
    return this.comboMultiplier;
  }

  getScore(): number {
    return this.score;
  }

  getFormattedScore(): string {
    return this.score.toLocaleString();
  }

  calculateRank(stats: HitStats): GameRank {
    const accuracy = stats.accuracy;
    const totalNotes = stats.totalNotes;
    const hitNotes = stats.hitNotes;
    const hitRate = totalNotes > 0 ? hitNotes / totalNotes : 0;

    if (stats.perfect === totalNotes && totalNotes > 0) {
      return GameRank.SSS;
    }

    if (accuracy >= 98 && hitRate >= 0.99) {
      return GameRank.SS;
    }

    if (accuracy >= 95 && hitRate >= 0.97) {
      return GameRank.S;
    }

    if (accuracy >= 90 && hitRate >= 0.90) {
      return GameRank.A;
    }

    if (accuracy >= 80 && hitRate >= 0.80) {
      return GameRank.B;
    }

    if (accuracy >= 60 && hitRate >= 0.60) {
      return GameRank.C;
    }

    return GameRank.F;
  }

  calculateFinalScore(stats: HitStats): number {
    let finalScore = 0;

    finalScore += stats.perfect * this.BASE_NOTE_SCORE;
    finalScore += stats.great * Math.floor(this.BASE_NOTE_SCORE * 0.75);
    finalScore += stats.good * Math.floor(this.BASE_NOTE_SCORE * 0.5);

    const maxComboBonus = stats.maxCombo * 100;
    finalScore += maxComboBonus;

    const accuracyBonus = Math.floor(stats.accuracy * 100);
    finalScore += accuracyBonus;

    return finalScore;
  }

  static getRankName(rank: GameRank): string {
    switch (rank) {
      case GameRank.SSS:
        return 'SSS';
      case GameRank.SS:
        return 'SS';
      case GameRank.S:
        return 'S';
      case GameRank.A:
        return 'A';
      case GameRank.B:
        return 'B';
      case GameRank.C:
        return 'C';
      case GameRank.F:
        return 'F';
      default:
        return '';
    }
  }

  static getRankColor(rank: GameRank): string {
    switch (rank) {
      case GameRank.SSS:
        return '#FFD700';
      case GameRank.SS:
        return '#FFA500';
      case GameRank.S:
        return '#FF6B6B';
      case GameRank.A:
        return '#4ECDC4';
      case GameRank.B:
        return '#45B7D1';
      case GameRank.C:
        return '#96CEB4';
      case GameRank.F:
        return '#FF6B6B';
      default:
        return '#FFFFFF';
    }
  }
}

export enum GameRank {
  SSS = 'sss',
  SS = 'ss',
  S = 's',
  A = 'a',
  B = 'b',
  C = 'c',
  F = 'f'
}
