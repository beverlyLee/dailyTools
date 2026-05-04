import { JudgeSystem, JudgeResult, DEFAULT_JUDGE_CONFIG } from '../src/game/JudgeSystem';

describe('JudgeSystem', () => {
  let judgeSystem: JudgeSystem;

  beforeEach(() => {
    judgeSystem = new JudgeSystem();
  });

  describe('judge method', () => {
    it('should return PERFECT when within perfect window', () => {
      const expectedTime = 1000;
      
      const resultOnTime = judgeSystem.judge(expectedTime, expectedTime);
      expect(resultOnTime.result).toBe(JudgeResult.PERFECT);
      expect(resultOnTime.errorMs).toBe(0);

      const resultEarly = judgeSystem.judge(expectedTime - 25, expectedTime);
      expect(resultEarly.result).toBe(JudgeResult.PERFECT);
      expect(resultEarly.isEarly).toBe(true);
      expect(resultEarly.errorMs).toBe(-25);

      const resultLate = judgeSystem.judge(expectedTime + 25, expectedTime);
      expect(resultLate.result).toBe(JudgeResult.PERFECT);
      expect(resultLate.isEarly).toBe(false);
      expect(resultLate.errorMs).toBe(25);
    });

    it('should return GREAT when within great window but outside perfect', () => {
      const expectedTime = 1000;
      
      const resultEarly = judgeSystem.judge(expectedTime - 75, expectedTime);
      expect(resultEarly.result).toBe(JudgeResult.GREAT);

      const resultLate = judgeSystem.judge(expectedTime + 75, expectedTime);
      expect(resultLate.result).toBe(JudgeResult.GREAT);
    });

    it('should return GOOD when within good window but outside great', () => {
      const expectedTime = 1000;
      
      const result = judgeSystem.judge(expectedTime + 125, expectedTime);
      expect(result.result).toBe(JudgeResult.GOOD);
    });

    it('should return MISS when within miss window but outside good', () => {
      const expectedTime = 1000;
      
      const result = judgeSystem.judge(expectedTime + 175, expectedTime);
      expect(result.result).toBe(JudgeResult.MISS);
    });

    it('should return NONE when outside miss window', () => {
      const expectedTime = 1000;
      
      const result = judgeSystem.judge(expectedTime + 300, expectedTime);
      expect(result.result).toBe(JudgeResult.NONE);
    });

    it('should calculate error with millisecond precision', () => {
      const expectedTime = 1000.1234;
      const actualTime = 1000.5678;

      const result = judgeSystem.judge(actualTime, expectedTime);
      expect(result.errorMs).toBeCloseTo(0.444, 3);
    });
  });

  describe('canHit method', () => {
    it('should return true when within miss window', () => {
      const noteTime = 1000;
      
      expect(judgeSystem.canHit(1000 - 200, noteTime)).toBe(true);
      expect(judgeSystem.canHit(1000 + 200, noteTime)).toBe(true);
      expect(judgeSystem.canHit(1000, noteTime)).toBe(true);
    });

    it('should return false when outside miss window', () => {
      const noteTime = 1000;
      
      expect(judgeSystem.canHit(1000 - 300, noteTime)).toBe(false);
      expect(judgeSystem.canHit(1000 + 300, noteTime)).toBe(false);
    });
  });

  describe('isTooLate method', () => {
    it('should return true when past miss window', () => {
      const noteTime = 1000;
      
      expect(judgeSystem.isTooLate(1000 + 201, noteTime)).toBe(true);
    });

    it('should return false when not past miss window', () => {
      const noteTime = 1000;
      
      expect(judgeSystem.isTooLate(1000 + 200, noteTime)).toBe(false);
      expect(judgeSystem.isTooLate(1000 - 100, noteTime)).toBe(false);
    });
  });

  describe('getJudgableRange method', () => {
    it('should return correct range based on miss window', () => {
      const noteTime = 1000;
      const range = judgeSystem.getJudgableRange(noteTime);
      
      expect(range.min).toBe(noteTime - DEFAULT_JUDGE_CONFIG.missWindow);
      expect(range.max).toBe(noteTime + DEFAULT_JUDGE_CONFIG.missWindow);
    });
  });

  describe('processResult and stats', () => {
    it('should increment perfect count on PERFECT', () => {
      judgeSystem.processResult(JudgeResult.PERFECT);
      const stats = judgeSystem.getStats();
      
      expect(stats.perfect).toBe(1);
      expect(stats.totalNotes).toBe(1);
      expect(stats.hitNotes).toBe(1);
    });

    it('should increment great count on GREAT', () => {
      judgeSystem.processResult(JudgeResult.GREAT);
      const stats = judgeSystem.getStats();
      
      expect(stats.great).toBe(1);
      expect(stats.totalNotes).toBe(1);
      expect(stats.hitNotes).toBe(1);
    });

    it('should increment good count on GOOD', () => {
      judgeSystem.processResult(JudgeResult.GOOD);
      const stats = judgeSystem.getStats();
      
      expect(stats.good).toBe(1);
      expect(stats.totalNotes).toBe(1);
      expect(stats.hitNotes).toBe(1);
    });

    it('should increment miss count on MISS and reset combo', () => {
      judgeSystem.processResult(JudgeResult.PERFECT);
      judgeSystem.processResult(JudgeResult.PERFECT);
      
      let stats = judgeSystem.getStats();
      expect(stats.combo).toBe(2);
      expect(stats.maxCombo).toBe(2);
      
      judgeSystem.processResult(JudgeResult.MISS);
      stats = judgeSystem.getStats();
      
      expect(stats.miss).toBe(1);
      expect(stats.totalNotes).toBe(3);
      expect(stats.hitNotes).toBe(2);
      expect(stats.combo).toBe(0);
      expect(stats.maxCombo).toBe(2);
    });

    it('should track max combo correctly', () => {
      for (let i = 0; i < 5; i++) {
        judgeSystem.processResult(JudgeResult.PERFECT);
      }
      
      let stats = judgeSystem.getStats();
      expect(stats.combo).toBe(5);
      expect(stats.maxCombo).toBe(5);
      
      judgeSystem.processResult(JudgeResult.MISS);
      
      for (let i = 0; i < 3; i++) {
        judgeSystem.processResult(JudgeResult.PERFECT);
      }
      
      stats = judgeSystem.getStats();
      expect(stats.combo).toBe(3);
      expect(stats.maxCombo).toBe(5);
    });

    it('should calculate accuracy correctly', () => {
      judgeSystem.processResult(JudgeResult.PERFECT);
      judgeSystem.processResult(JudgeResult.PERFECT);
      judgeSystem.processResult(JudgeResult.GREAT);
      judgeSystem.processResult(JudgeResult.GOOD);
      judgeSystem.processResult(JudgeResult.MISS);
      
      const stats = judgeSystem.getStats();
      
      const expectedAccuracy = ((2 * 100 + 1 * 75 + 1 * 50 + 1 * 0) / 500) * 100;
      expect(stats.accuracy).toBeCloseTo(expectedAccuracy, 2);
    });
  });

  describe('resetStats method', () => {
    it('should reset all stats to initial values', () => {
      judgeSystem.processResult(JudgeResult.PERFECT);
      judgeSystem.processResult(JudgeResult.GREAT);
      judgeSystem.processResult(JudgeResult.MISS);
      
      judgeSystem.resetStats();
      const stats = judgeSystem.getStats();
      
      expect(stats.perfect).toBe(0);
      expect(stats.great).toBe(0);
      expect(stats.good).toBe(0);
      expect(stats.miss).toBe(0);
      expect(stats.combo).toBe(0);
      expect(stats.maxCombo).toBe(0);
      expect(stats.accuracy).toBe(100);
      expect(stats.totalNotes).toBe(0);
      expect(stats.hitNotes).toBe(0);
    });
  });

  describe('setConfig method', () => {
    it('should update configuration', () => {
      const newConfig = {
        perfectWindow: 30,
        greatWindow: 60,
        goodWindow: 90,
        missWindow: 120
      };
      
      judgeSystem.setConfig(newConfig);
      
      const config = judgeSystem.getConfig();
      expect(config.perfectWindow).toBe(newConfig.perfectWindow);
      expect(config.greatWindow).toBe(newConfig.greatWindow);
      expect(config.goodWindow).toBe(newConfig.goodWindow);
      expect(config.missWindow).toBe(newConfig.missWindow);
    });
  });

  describe('getJudgeTimeWindow method', () => {
    it('should return correct window for each result', () => {
      const config = judgeSystem.getConfig();
      
      expect(judgeSystem.getJudgeTimeWindow(JudgeResult.PERFECT)).toBe(config.perfectWindow);
      expect(judgeSystem.getJudgeTimeWindow(JudgeResult.GREAT)).toBe(config.greatWindow);
      expect(judgeSystem.getJudgeTimeWindow(JudgeResult.GOOD)).toBe(config.goodWindow);
      expect(judgeSystem.getJudgeTimeWindow(JudgeResult.MISS)).toBe(config.missWindow);
    });
  });

  describe('static helper methods', () => {
    it('getResultScore should return correct scores', () => {
      expect(JudgeSystem.getResultScore(JudgeResult.PERFECT)).toBe(1000);
      expect(JudgeSystem.getResultScore(JudgeResult.GREAT)).toBe(750);
      expect(JudgeSystem.getResultScore(JudgeResult.GOOD)).toBe(500);
      expect(JudgeSystem.getResultScore(JudgeResult.MISS)).toBe(0);
      expect(JudgeSystem.getResultScore(JudgeResult.NONE)).toBe(0);
    });

    it('getResultName should return correct names', () => {
      expect(JudgeSystem.getResultName(JudgeResult.PERFECT)).toBe('PERFECT');
      expect(JudgeSystem.getResultName(JudgeResult.GREAT)).toBe('GREAT');
      expect(JudgeSystem.getResultName(JudgeResult.GOOD)).toBe('GOOD');
      expect(JudgeSystem.getResultName(JudgeResult.MISS)).toBe('MISS');
      expect(JudgeSystem.getResultName(JudgeResult.NONE)).toBe('');
    });

    it('getResultColor should return correct colors', () => {
      expect(JudgeSystem.getResultColor(JudgeResult.PERFECT)).toBe('#FFD700');
      expect(JudgeSystem.getResultColor(JudgeResult.GREAT)).toBe('#00FF88');
      expect(JudgeSystem.getResultColor(JudgeResult.GOOD)).toBe('#00AAFF');
      expect(JudgeSystem.getResultColor(JudgeResult.MISS)).toBe('#FF4444');
    });
  });

  describe('custom configuration', () => {
    it('should use custom configuration when provided', () => {
      const customConfig = {
        perfectWindow: 20,
        greatWindow: 40,
        goodWindow: 60,
        missWindow: 80
      };
      
      const customJudge = new JudgeSystem(customConfig);
      const expectedTime = 1000;
      
      expect(customJudge.judge(expectedTime + 15, expectedTime).result).toBe(JudgeResult.PERFECT);
      expect(customJudge.judge(expectedTime + 25, expectedTime).result).toBe(JudgeResult.GREAT);
      expect(customJudge.judge(expectedTime + 50, expectedTime).result).toBe(JudgeResult.GOOD);
      expect(customJudge.judge(expectedTime + 70, expectedTime).result).toBe(JudgeResult.MISS);
      expect(customJudge.judge(expectedTime + 100, expectedTime).result).toBe(JudgeResult.NONE);
    });
  });

  describe('judgeAtTime with release timing', () => {
    it('should have wider windows for release timing', () => {
      const expectedTime = 1000;
      
      const normalResult = judgeSystem.judgeAtTime(expectedTime + 60, expectedTime, false);
      expect(normalResult.result).toBe(JudgeResult.GREAT);
      
      const releaseResult = judgeSystem.judgeAtTime(expectedTime + 60, expectedTime, true);
      expect(releaseResult.result).toBe(JudgeResult.PERFECT);
    });
  });
});
