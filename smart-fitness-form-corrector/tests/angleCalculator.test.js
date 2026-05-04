import { describe, it, expect } from 'vitest';
import { AngleCalculator, SymmetryChecker } from '../src/utils/angleCalculator.js';

describe('AngleCalculator', () => {
  describe('calculateAngle', () => {
    it('should return null when any point is null', () => {
      const result = AngleCalculator.calculateAngle(null, { x: 0, y: 0, score: 1 }, { x: 1, y: 1, score: 1 });
      expect(result).toBeNull();
    });

    it('should return null when confidence is too low', () => {
      const result = AngleCalculator.calculateAngle(
        { x: 0, y: 0, score: 0.2 },
        { x: 1, y: 0, score: 1 },
        { x: 1, y: 1, score: 1 }
      );
      expect(result).toBeNull();
    });

    it('should calculate 90 degree angle correctly', () => {
      const pointA = { x: 0, y: 0, score: 1 };
      const pointB = { x: 1, y: 0, score: 1 };
      const pointC = { x: 1, y: 1, score: 1 };

      const result = AngleCalculator.calculateAngle(pointA, pointB, pointC);
      expect(result).toBeCloseTo(90, 0);
    });

    it('should calculate 180 degree angle (straight line)', () => {
      const pointA = { x: 0, y: 0, score: 1 };
      const pointB = { x: 1, y: 0, score: 1 };
      const pointC = { x: 2, y: 0, score: 1 };

      const result = AngleCalculator.calculateAngle(pointA, pointB, pointC);
      expect(result).toBeCloseTo(180, 0);
    });

    it('should calculate 45 degree angle', () => {
      const pointA = { x: 0, y: 0, score: 1 };
      const pointB = { x: 1, y: 0, score: 1 };
      const pointC = { x: 2, y: 1, score: 1 };

      const result = AngleCalculator.calculateAngle(pointA, pointB, pointC);
      expect(result).toBeCloseTo(45, 0);
    });

    it('should be symmetric regardless of point order', () => {
      const pointA = { x: 0, y: 0, score: 1 };
      const pointB = { x: 1, y: 0, score: 1 };
      const pointC = { x: 1, y: 1, score: 1 };

      const result1 = AngleCalculator.calculateAngle(pointA, pointB, pointC);
      const result2 = AngleCalculator.calculateAngle(pointC, pointB, pointA);

      expect(result1).toEqual(result2);
    });
  });

  describe('calculateKneeAngle', () => {
    it('should calculate knee angle correctly for standing position', () => {
      const hip = { x: 100, y: 100, score: 1 };
      const knee = { x: 100, y: 200, score: 1 };
      const ankle = { x: 100, y: 300, score: 1 };

      const result = AngleCalculator.calculateKneeAngle(hip, knee, ankle);
      expect(result).toBeCloseTo(180, 0);
    });

    it('should calculate knee angle correctly for 90 degree squat', () => {
      const hip = { x: 100, y: 100, score: 1 };
      const knee = { x: 100, y: 200, score: 1 };
      const ankle = { x: 200, y: 200, score: 1 };

      const result = AngleCalculator.calculateKneeAngle(hip, knee, ankle);
      expect(result).toBeCloseTo(90, 0);
    });
  });

  describe('calculateHipAngle', () => {
    it('should calculate hip angle correctly for standing position', () => {
      const shoulder = { x: 100, y: 50, score: 1 };
      const hip = { x: 100, y: 100, score: 1 };
      const knee = { x: 100, y: 200, score: 1 };

      const result = AngleCalculator.calculateHipAngle(shoulder, hip, knee);
      expect(result).toBeCloseTo(180, 0);
    });

    it('should calculate hip angle correctly for bent position', () => {
      const shoulder = { x: 100, y: 50, score: 1 };
      const hip = { x: 100, y: 100, score: 1 };
      const knee = { x: 150, y: 150, score: 1 };

      const result = AngleCalculator.calculateHipAngle(shoulder, hip, knee);
      expect(result).toBeLessThan(180);
    });
  });

  describe('calculateElbowAngle', () => {
    it('should calculate elbow angle correctly for straight arm', () => {
      const shoulder = { x: 50, y: 100, score: 1 };
      const elbow = { x: 100, y: 100, score: 1 };
      const wrist = { x: 150, y: 100, score: 1 };

      const result = AngleCalculator.calculateElbowAngle(shoulder, elbow, wrist);
      expect(result).toBeCloseTo(180, 0);
    });

    it('should calculate elbow angle correctly for bent arm', () => {
      const shoulder = { x: 50, y: 100, score: 1 };
      const elbow = { x: 100, y: 100, score: 1 };
      const wrist = { x: 100, y: 150, score: 1 };

      const result = AngleCalculator.calculateElbowAngle(shoulder, elbow, wrist);
      expect(result).toBeCloseTo(90, 0);
    });
  });

  describe('calculateAllAngles', () => {
    it('should calculate all angles from keypoints', () => {
      const keypoints = {
        left_shoulder: { x: 80, y: 80, score: 1 },
        right_shoulder: { x: 120, y: 80, score: 1 },
        left_elbow: { x: 50, y: 120, score: 1 },
        right_elbow: { x: 150, y: 120, score: 1 },
        left_wrist: { x: 30, y: 160, score: 1 },
        right_wrist: { x: 170, y: 160, score: 1 },
        left_hip: { x: 90, y: 150, score: 1 },
        right_hip: { x: 110, y: 150, score: 1 },
        left_knee: { x: 90, y: 220, score: 1 },
        right_knee: { x: 110, y: 220, score: 1 },
        left_ankle: { x: 90, y: 300, score: 1 },
        right_ankle: { x: 110, y: 300, score: 1 }
      };

      const angles = AngleCalculator.calculateAllAngles(keypoints);

      expect(angles.leftKnee).toBeDefined();
      expect(angles.rightKnee).toBeDefined();
      expect(angles.leftHip).toBeDefined();
      expect(angles.rightHip).toBeDefined();
      expect(angles.leftShoulder).toBeDefined();
      expect(angles.rightShoulder).toBeDefined();
      expect(angles.leftElbow).toBeDefined();
      expect(angles.rightElbow).toBeDefined();
    });

    it('should return null for missing keypoints', () => {
      const keypoints = {
        left_shoulder: { x: 80, y: 80, score: 1 },
        right_shoulder: { x: 120, y: 80, score: 1 },
        left_elbow: null,
        right_elbow: { x: 150, y: 120, score: 1 },
        left_wrist: { x: 30, y: 160, score: 1 },
        right_wrist: { x: 170, y: 160, score: 1 },
        left_hip: { x: 90, y: 150, score: 1 },
        right_hip: { x: 110, y: 150, score: 1 },
        left_knee: { x: 90, y: 220, score: 1 },
        right_knee: { x: 110, y: 220, score: 1 },
        left_ankle: { x: 90, y: 300, score: 1 },
        right_ankle: { x: 110, y: 300, score: 1 }
      };

      const angles = AngleCalculator.calculateAllAngles(keypoints);
      expect(angles.leftElbow).toBeNull();
    });
  });

  describe('isAngleWithinRange', () => {
    it('should return true when angle is within tolerance', () => {
      const result = AngleCalculator.isAngleWithinRange(90, 90, 15);
      expect(result).toBe(true);
    });

    it('should return true when angle is at boundary', () => {
      const result = AngleCalculator.isAngleWithinRange(105, 90, 15);
      expect(result).toBe(true);
    });

    it('should return false when angle is outside tolerance', () => {
      const result = AngleCalculator.isAngleWithinRange(110, 90, 15);
      expect(result).toBe(false);
    });

    it('should return false when angle is null', () => {
      const result = AngleCalculator.isAngleWithinRange(null, 90, 15);
      expect(result).toBe(false);
    });
  });

  describe('getAngleDeviation', () => {
    it('should calculate positive deviation', () => {
      const result = AngleCalculator.getAngleDeviation(100, 90);
      expect(result).toBe(10);
    });

    it('should calculate negative deviation', () => {
      const result = AngleCalculator.getAngleDeviation(80, 90);
      expect(result).toBe(-10);
    });

    it('should return null when input is null', () => {
      const result = AngleCalculator.getAngleDeviation(null, 90);
      expect(result).toBeNull();
    });
  });

  describe('calculateSymmetry', () => {
    it('should calculate zero deviation for symmetric angles', () => {
      const result = AngleCalculator.calculateSymmetry(90, 90);
      expect(result).toBe(0);
    });

    it('should calculate absolute deviation', () => {
      const result = AngleCalculator.calculateSymmetry(95, 85);
      expect(result).toBe(10);
    });

    it('should return null when input is null', () => {
      const result = AngleCalculator.calculateSymmetry(null, 90);
      expect(result).toBeNull();
    });
  });
});

describe('SymmetryChecker', () => {
  describe('checkKneeSymmetry', () => {
    it('should return symmetric when angles are close', () => {
      const angles = { leftKnee: 90, rightKnee: 95 };
      const result = SymmetryChecker.checkKneeSymmetry(angles);
      expect(result.symmetric).toBe(true);
    });

    it('should return asymmetric when angles differ significantly', () => {
      const angles = { leftKnee: 90, rightKnee: 120 };
      const result = SymmetryChecker.checkKneeSymmetry(angles);
      expect(result.symmetric).toBe(false);
      expect(result.deviation).toBe(30);
    });

    it('should handle null angles', () => {
      const angles = { leftKnee: null, rightKnee: 90 };
      const result = SymmetryChecker.checkKneeSymmetry(angles);
      expect(result.symmetric).toBe(false);
      expect(result.deviation).toBeNull();
    });
  });

  describe('checkOverallSymmetry', () => {
    it('should return balanced when all angles are symmetric', () => {
      const angles = {
        leftKnee: 90,
        rightKnee: 92,
        leftHip: 100,
        rightHip: 105,
        leftShoulder: 80,
        rightShoulder: 85
      };
      const result = SymmetryChecker.checkOverallSymmetry(angles);
      expect(result.isBalanced).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should return issues when angles are asymmetric', () => {
      const angles = {
        leftKnee: 90,
        rightKnee: 120,
        leftHip: 100,
        rightHip: 105,
        leftShoulder: 80,
        rightShoulder: 85
      };
      const result = SymmetryChecker.checkOverallSymmetry(angles);
      expect(result.isBalanced).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
