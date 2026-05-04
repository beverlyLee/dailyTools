import { ScoreSystem, GameRank } from '../src/game/ScoreSystem';
import { JudgeResult, HitStats } from '../src/game/JudgeSystem';

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    scoreSystem = new ScoreSystem();
  });

  describe('constructor and reset', () => {
    it('should initialize with zero score', () => {
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('should reset score to zero', () => {
      scoreSystem.addScore(JudgeResult.PERFECT, 1);
      expect(scoreSystem.getScore()).toBeGreaterThan(0);
      
      scoreSystem.reset();
      expect(scoreSystem.getScore()).toBe(0);
    });
  });

  describe('getBaseScore', () => {
    it('should return correct base score for PERFECT', () => {
      expect(scoreSystem.getBaseScore(JudgeResult.PERFECT)).toBe(1000);
    });

    it('should return correct base score for GREAT', () => {
      expect(scoreSystem.getBaseScore(JudgeResult.GREAT)).toBe(750);
    });

    it('should return correct base score for GOOD', () => {
      expect(scoreSystem.getBaseScore(JudgeResult.GOOD)).toBe(500);
    });

    it('should return correct base score for MISS', () => {
      expect(scoreSystem.getBaseScore(JudgeResult.MISS)).toBe(0);
    });

    it('should return correct base score for NONE', () => {
      expect(scoreSystem.getBaseScore(JudgeResult.NONE)).toBe(0);
    });
  });

  describe('calculateComboBonus', () => {
    it('should return 0 when combo is less than 10', () => {
      expect(scoreSystem.calculateComboBonus(5, 1000)).toBe(0);
      expect(scoreSystem.calculateComboBonus(9, 1000)).toBe(0);
    });

    it('should return bonus when combo is 10 or more', () => {
      const baseScore = 1000;
      const combo10Bonus = scoreSystem.calculateComboBonus(10, baseScore);
      expect(combo10Bonus).toBeGreaterThan(0);
      
      const combo20Bonus = scoreSystem.calculateComboBonus(20, baseScore);
      expect(combo20Bonus).toBeGreaterThanOrEqual(combo10Bonus);
      
      const combo100Bonus = scoreSystem.calculateComboBonus(100, baseScore);
      expect(combo100Bonus).toBeGreaterThanOrEqual(combo20Bonus);
    });

    it('should cap combo bonus at 100% of base score', () => {
      const baseScore = 1000;
      const maxComboBonus = scoreSystem.calculateComboBonus(1000, baseScore);
      expect(maxComboBonus).toBeLessThanOrEqual(baseScore);
    });
  });

  describe('calculateScore', () => {
    it('should calculate score correctly for PERFECT with no combo', () => {
      const breakdown = scoreSystem.calculateScore(JudgeResult.PERFECT, 5);
      
      expect(breakdown.baseScore).toBe(1000);
      expect(breakdown.comboBonus).toBe(0);
      expect(breakdown.totalScore).toBe(1000);
    });

    it('should calculate score correctly for PERFECT with combo bonus', () => {
      const breakdown = scoreSystem.calculateScore(JudgeResult.PERFECT, 15);
      
      expect(breakdown.baseScore).toBe(1000);
      expect(breakdown.comboBonus).toBeGreaterThan(0);
      expect(breakdown.totalScore).toBe(breakdown.baseScore + breakdown.comboBonus);
    });

    it('should calculate score correctly for GREAT', () => {
      const breakdown = scoreSystem.calculateScore(JudgeResult.GREAT, 5);
      
      expect(breakdown.baseScore).toBe(750);
      expect(breakdown.totalScore).toBe(750);
    });

    it('should calculate score correctly for MISS', () => {
      const breakdown = scoreSystem.calculateScore(JudgeResult.MISS, 10);
      
      expect(breakdown.baseScore).toBe(0);
      expect(breakdown.comboBonus).toBe(0);
      expect(breakdown.totalScore).toBe(0);
    });
  });

  describe('addScore', () => {
    it('should accumulate scores correctly', () => {
      let score = scoreSystem.addScore(JudgeResult.PERFECT, 1);
      expect(score).toBe(1000);
      expect(scoreSystem.getScore()).toBe(1000);
      
      score = scoreSystem.addScore(JudgeResult.PERFECT, 2);
      expect(score).toBe(2000);
      expect(scoreSystem.getScore()).toBe(2000);
      
      score = scoreSystem.addScore(JudgeResult.GREAT, 3);
      expect(score).toBe(2750);
      expect(scoreSystem.getScore()).toBe(2750);
    });

    it('should include combo bonus in accumulated score', () => {
      scoreSystem.addScore(JudgeResult.PERFECT, 1);
      scoreSystem.addScore(JudgeResult.PERFECT, 2);
      
      const scoreWithCombo = scoreSystem.addScore(JudgeResult.PERFECT, 15);
      expect(scoreWithCombo).toBeGreaterThan(3000);
    });
  });

  describe('getFormattedScore', () => {
    it('should format score with commas', () => {
      scoreSystem.addScore(JudgeResult.PERFECT, 1);
      expect(scoreSystem.getFormattedScore()).toBe('1,000');
      
      for (let i = 0; i < 9; i++) {
        scoreSystem.addScore(JudgeResult.PERFECT, 1);
      }
      expect(scoreSystem.getFormattedScore()).toBe('10,000');
    });
  });

  describe('calculateRank', () => {
    const createStats = (overrides: Partial<HitStats>): HitStats => ({
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      totalNotes: 0,
      hitNotes: 0,
      ...overrides
    });

    it('should return SSS for perfect game', () => {
      const stats = createStats({
        perfect: 100,
        great: 0,
        good: 0,
        miss: 0,
        totalNotes: 100,
        hitNotes: 100,
        accuracy: 100
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.SSS);
    });

    it('should return SS for near perfect with high accuracy', () => {
      const stats = createStats({
        perfect: 99,
        great: 1,
        good: 0,
        miss: 0,
        totalNotes: 100,
        hitNotes: 100,
        accuracy: 99.75
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.SS);
    });

    it('should return S for excellent performance', () => {
      const stats = createStats({
        perfect: 90,
        great: 7,
        good: 3,
        miss: 0,
        totalNotes: 100,
        hitNotes: 100,
        accuracy: 96.75
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.S);
    });

    it('should return A for good performance', () => {
      const stats = createStats({
        perfect: 70,
        great: 20,
        good: 10,
        miss: 0,
        totalNotes: 100,
        hitNotes: 100,
        accuracy: 90
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.A);
    });

    it('should return B for average performance', () => {
      const stats = createStats({
        perfect: 60,
        great: 20,
        good: 5,
        miss: 15,
        totalNotes: 100,
        hitNotes: 85,
        accuracy: 80
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.B);
    });

    it('should return C for below average performance', () => {
      const stats = createStats({
        perfect: 40,
        great: 15,
        good: 10,
        miss: 35,
        totalNotes: 100,
        hitNotes: 65,
        accuracy: 61.25
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.C);
    });

    it('should return F for poor performance', () => {
      const stats = createStats({
        perfect: 10,
        great: 10,
        good: 10,
        miss: 70,
        totalNotes: 100,
        hitNotes: 30,
        accuracy: 27.5
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.F);
    });

    it('should handle zero notes case', () => {
      const stats = createStats({
        perfect: 0,
        great: 0,
        good: 0,
        miss: 0,
        totalNotes: 0,
        hitNotes: 0,
        accuracy: 100
      });
      
      expect(scoreSystem.calculateRank(stats)).toBe(GameRank.F);
    });
  });

  describe('calculateFinalScore', () => {
    const createStats = (overrides: Partial<HitStats>): HitStats => ({
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      totalNotes: 0,
      hitNotes: 0,
      ...overrides
    });

    it('should calculate final score based on stats', () => {
      const stats = createStats({
        perfect: 10,
        great: 5,
        good: 3,
        miss: 2,
        maxCombo: 15,
        accuracy: 85
      });
      
      const expectedScore = 
        (10 * 1000) + 
        (5 * 750) + 
        (3 * 500) + 
        (15 * 100) + 
        Math.floor(85 * 100);
      
      expect(scoreSystem.calculateFinalScore(stats)).toBe(expectedScore);
    });

    it('should calculate zero score for all misses', () => {
      const stats = createStats({
        perfect: 0,
        great: 0,
        good: 0,
        miss: 10,
        maxCombo: 0,
        accuracy: 0
      });
      
      const expectedScore = (0 * 100) + Math.floor(0 * 100);
      expect(scoreSystem.calculateFinalScore(stats)).toBe(expectedScore);
    });
  });

  describe('static rank methods', () => {
    it('getRankName should return correct names', () => {
      expect(ScoreSystem.getRankName(GameRank.SSS)).toBe('SSS');
      expect(ScoreSystem.getRankName(GameRank.SS)).toBe('SS');
      expect(ScoreSystem.getRankName(GameRank.S)).toBe('S');
      expect(ScoreSystem.getRankName(GameRank.A)).toBe('A');
      expect(ScoreSystem.getRankName(GameRank.B)).toBe('B');
      expect(ScoreSystem.getRankName(GameRank.C)).toBe('C');
      expect(ScoreSystem.getRankName(GameRank.F)).toBe('F');
    });

    it('getRankColor should return correct colors', () => {
      expect(ScoreSystem.getRankColor(GameRank.SSS)).toBe('#FFD700');
      expect(ScoreSystem.getRankColor(GameRank.SS)).toBe('#FFA500');
      expect(ScoreSystem.getRankColor(GameRank.S)).toBe('#FF6B6B');
      expect(ScoreSystem.getRankColor(GameRank.A)).toBe('#4ECDC4');
      expect(ScoreSystem.getRankColor(GameRank.B)).toBe('#45B7D1');
      expect(ScoreSystem.getRankColor(GameRank.C)).toBe('#96CEB4');
      expect(ScoreSystem.getRankColor(GameRank.F)).toBe('#FF6B6B');
    });
  });

  describe('getComboMultiplier', () => {
    it('should return 1 initially', () => {
      expect(scoreSystem.getComboMultiplier()).toBe(1);
    });
  });
});
