import { AngleCalculator } from './angleCalculator.js';

export const EXERCISE_LIBRARY = {
  squat: {
    name: '深蹲',
    nameEn: 'Squat',
    description: '锻炼腿部和臀部的基础动作',
    keyAngles: ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'],
    standards: {
      standing: {
        name: '站立姿势',
        angles: {
          leftKnee: { min: 160, max: 180, ideal: 180 },
          rightKnee: { min: 160, max: 180, ideal: 180 },
          leftHip: { min: 160, max: 180, ideal: 180 },
          rightHip: { min: 160, max: 180, ideal: 180 }
        },
        feedback: {
          good: '站立姿势正确，准备下蹲',
          improve: '请保持身体直立'
        }
      },
      descent: {
        name: '下蹲过程',
        angles: {
          leftKnee: { min: 90, max: 160, ideal: 120 },
          rightKnee: { min: 90, max: 160, ideal: 120 },
          leftHip: { min: 90, max: 160, ideal: 120 },
          rightHip: { min: 90, max: 160, ideal: 120 }
        },
        feedback: {
          good: '下蹲动作流畅',
          improve: '控制动作节奏，慢慢下蹲'
        }
      },
      bottom: {
        name: '底部姿势',
        angles: {
          leftKnee: { min: 70, max: 100, ideal: 90 },
          rightKnee: { min: 70, max: 100, ideal: 90 },
          leftHip: { min: 70, max: 100, ideal: 90 },
          rightHip: { min: 70, max: 100, ideal: 90 }
        },
        feedback: {
          good: '底部姿势标准，大腿平行于地面',
          improve: '请继续下蹲直到大腿平行于地面'
        }
      }
    },
    commonMistakes: [
      {
        id: 'knee_over_toe',
        name: '膝盖超过脚尖',
        check: (keypoints, angles) => {
          const leftKnee = keypoints.left_knee;
          const leftAnkle = keypoints.left_ankle;
          const rightKnee = keypoints.right_knee;
          const rightAnkle = keypoints.right_ankle;

          if (!leftKnee || !leftAnkle || !rightKnee || !rightAnkle) return false;

          const leftKneeForward = leftKnee.x > leftAnkle.x + 20;
          const rightKneeForward = rightKnee.x < rightAnkle.x - 20;

          return leftKneeForward || rightKneeForward;
        },
        feedback: '膝盖不要超过脚尖，请将重心向后移',
        severity: 'warning'
      },
      {
        id: 'leaning_forward',
        name: '身体过度前倾',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;

          if (!leftShoulder || !leftHip || !rightShoulder || !rightHip) return false;

          const leftLean = Math.abs(leftShoulder.y - leftHip.y);
          const rightLean = Math.abs(rightShoulder.y - rightHip.y);
          const avgLean = (leftLean + rightLean) / 2;

          return angles.leftKnee && angles.leftKnee < 120 && avgLean < 80;
        },
        feedback: '身体不要过度前倾，请保持背部挺直',
        severity: 'warning'
      },
      {
        id: 'knee_valgus',
        name: '膝盖内扣',
        check: (keypoints, angles) => {
          const leftKnee = keypoints.left_knee;
          const rightKnee = keypoints.right_knee;
          const leftHip = keypoints.left_hip;
          const rightHip = keypoints.right_hip;

          if (!leftKnee || !rightKnee || !leftHip || !rightHip) return false;

          const hipWidth = Math.abs(rightHip.x - leftHip.x);
          const kneeWidth = Math.abs(rightKnee.x - leftKnee.x);

          return kneeWidth < hipWidth * 0.6;
        },
        feedback: '膝盖不要内扣，请保持膝盖与脚尖方向一致',
        severity: 'error'
      },
      {
        id: 'not_deep_enough',
        name: '下蹲深度不够',
        check: (keypoints, angles) => {
          if (!angles.leftKnee || !angles.rightKnee) return false;
          const avgKneeAngle = (angles.leftKnee + angles.rightKnee) / 2;
          return avgKneeAngle > 110;
        },
        feedback: '请继续下蹲，直到大腿平行于地面',
        severity: 'warning'
      }
    ]
  },

  pushup: {
    name: '俯卧撑',
    nameEn: 'Push-up',
    description: '锻炼胸部、肩部和手臂的经典动作',
    keyAngles: ['leftElbow', 'rightElbow', 'leftShoulder', 'rightShoulder'],
    standards: {
      top: {
        name: '顶部姿势',
        angles: {
          leftElbow: { min: 160, max: 180, ideal: 180 },
          rightElbow: { min: 160, max: 180, ideal: 180 },
          leftShoulder: { min: 70, max: 110, ideal: 90 },
          rightShoulder: { min: 70, max: 110, ideal: 90 }
        },
        feedback: {
          good: '顶部姿势标准，手臂伸直',
          improve: '请完全伸直手臂'
        }
      },
      descent: {
        name: '下放过程',
        angles: {
          leftElbow: { min: 90, max: 160, ideal: 135 },
          rightElbow: { min: 90, max: 160, ideal: 135 },
          leftShoulder: { min: 45, max: 90, ideal: 70 },
          rightShoulder: { min: 45, max: 90, ideal: 70 }
        },
        feedback: {
          good: '下放动作流畅',
          improve: '控制动作节奏，慢慢下放'
        }
      },
      bottom: {
        name: '底部姿势',
        angles: {
          leftElbow: { min: 70, max: 100, ideal: 90 },
          rightElbow: { min: 70, max: 100, ideal: 90 },
          leftShoulder: { min: 30, max: 60, ideal: 45 },
          rightShoulder: { min: 30, max: 60, ideal: 45 }
        },
        feedback: {
          good: '底部姿势标准，胸部接近地面',
          improve: '请继续下放，让胸部更接近地面'
        }
      }
    },
    commonMistakes: [
      {
        id: 'sagging_hips',
        name: '臀部下沉',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const leftAnkle = keypoints.left_ankle;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;
          const rightAnkle = keypoints.right_ankle;

          if (!leftShoulder || !leftHip || !leftAnkle || !rightShoulder || !rightHip || !rightAnkle) return false;

          const hipY = (leftHip.y + rightHip.y) / 2;
          const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
          const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

          return hipY > shoulderY + 30 && hipY > ankleY - 20;
        },
        feedback: '臀部不要下沉，请收紧核心保持身体成一条直线',
        severity: 'warning'
      },
      {
        id: 'elevated_hips',
        name: '臀部过高',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const leftAnkle = keypoints.left_ankle;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;
          const rightAnkle = keypoints.right_ankle;

          if (!leftShoulder || !leftHip || !leftAnkle || !rightShoulder || !rightHip || !rightAnkle) return false;

          const hipY = (leftHip.y + rightHip.y) / 2;
          const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

          return hipY < shoulderY - 40;
        },
        feedback: '臀部不要抬得太高，请保持身体成一条直线',
        severity: 'warning'
      },
      {
        id: 'elbows_flared',
        name: '手肘外展过大',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftElbow = keypoints.left_elbow;
          const rightShoulder = keypoints.right_shoulder;
          const rightElbow = keypoints.right_elbow;

          if (!leftShoulder || !leftElbow || !rightShoulder || !rightElbow) return false;

          const leftElbowOut = leftElbow.x < leftShoulder.x - 30;
          const rightElbowOut = rightElbow.x > rightShoulder.x + 30;

          return leftElbowOut || rightElbowOut;
        },
        feedback: '手肘不要外展过大，请将手肘靠近身体两侧',
        severity: 'warning'
      },
      {
        id: 'not_low_enough',
        name: '下放深度不够',
        check: (keypoints, angles) => {
          if (!angles.leftElbow || !angles.rightElbow) return false;
          const avgElbowAngle = (angles.leftElbow + angles.rightElbow) / 2;
          return avgElbowAngle > 120;
        },
        feedback: '请继续下放，让胸部更接近地面',
        severity: 'warning'
      }
    ]
  },

  plank: {
    name: '平板支撑',
    nameEn: 'Plank',
    description: '核心力量训练的基础动作',
    keyAngles: ['leftHip', 'rightHip', 'leftShoulder', 'rightShoulder'],
    standards: {
      hold: {
        name: '保持姿势',
        angles: {
          leftHip: { min: 160, max: 180, ideal: 180 },
          rightHip: { min: 160, max: 180, ideal: 180 },
          leftShoulder: { min: 80, max: 100, ideal: 90 },
          rightShoulder: { min: 80, max: 100, ideal: 90 }
        },
        feedback: {
          good: '平板支撑姿势标准，继续保持',
          improve: '请调整身体姿势'
        }
      }
    },
    commonMistakes: [
      {
        id: 'sagging_hips',
        name: '臀部下沉',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const leftAnkle = keypoints.left_ankle;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;
          const rightAnkle = keypoints.right_ankle;

          if (!leftShoulder || !leftHip || !leftAnkle || !rightShoulder || !rightHip || !rightAnkle) return false;

          const hipY = (leftHip.y + rightHip.y) / 2;
          const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

          return hipY > shoulderY + 30;
        },
        feedback: '臀部不要下沉，请收紧核心抬起臀部',
        severity: 'error'
      },
      {
        id: 'elevated_hips',
        name: '臀部过高',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;

          if (!leftShoulder || !leftHip || !rightShoulder || !rightHip) return false;

          const hipY = (leftHip.y + rightHip.y) / 2;
          const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

          return hipY < shoulderY - 40;
        },
        feedback: '臀部不要抬得太高，请降低臀部保持身体成直线',
        severity: 'warning'
      },
      {
        id: 'head_hanging',
        name: '头部下垂',
        check: (keypoints, angles) => {
          const nose = keypoints.nose;
          const leftShoulder = keypoints.left_shoulder;
          const rightShoulder = keypoints.right_shoulder;

          if (!nose || !leftShoulder || !rightShoulder) return false;

          const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
          return nose.y > shoulderY + 50;
        },
        feedback: '头部不要下垂，请抬起头部保持颈部自然',
        severity: 'warning'
      }
    ]
  },

  lunge: {
    name: '弓步蹲',
    nameEn: 'Lunge',
    description: '锻炼腿部力量和平衡能力',
    keyAngles: ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'],
    standards: {
      standing: {
        name: '站立准备',
        angles: {
          leftKnee: { min: 160, max: 180, ideal: 180 },
          rightKnee: { min: 160, max: 180, ideal: 180 },
          leftHip: { min: 160, max: 180, ideal: 180 },
          rightHip: { min: 160, max: 180, ideal: 180 }
        },
        feedback: {
          good: '准备姿势正确',
          improve: '请保持身体直立'
        }
      },
      lunge: {
        name: '弓步姿势',
        angles: {
          leftKnee: { min: 70, max: 110, ideal: 90 },
          rightKnee: { min: 70, max: 110, ideal: 90 },
          leftHip: { min: 70, max: 110, ideal: 90 },
          rightHip: { min: 70, max: 110, ideal: 90 }
        },
        feedback: {
          good: '弓步姿势标准',
          improve: '请调整膝盖角度'
        }
      }
    },
    commonMistakes: [
      {
        id: 'front_knee_over_toe',
        name: '前膝超过脚尖',
        check: (keypoints, angles) => {
          const leftKnee = keypoints.left_knee;
          const leftAnkle = keypoints.left_ankle;
          const rightKnee = keypoints.right_knee;
          const rightAnkle = keypoints.right_ankle;

          if (!leftKnee || !leftAnkle || !rightKnee || !rightAnkle) return false;

          const kneeForward = (angle) => angle < 130;
          if (angles.leftKnee && angles.rightKnee) {
            if (angles.leftKnee < angles.rightKnee) {
              return leftKnee.x > leftAnkle.x + 20;
            } else {
              return rightKnee.x < rightAnkle.x - 20;
            }
          }
          return false;
        },
        feedback: '前膝不要超过脚尖',
        severity: 'warning'
      },
      {
        id: 'back_knee_too_low',
        name: '后膝过低',
        check: (keypoints, angles) => {
          const leftKnee = keypoints.left_knee;
          const rightKnee = keypoints.right_knee;

          if (!leftKnee || !rightKnee) return false;

          if (angles.leftKnee && angles.rightKnee) {
            const backKneeAngle = angles.leftKnee > angles.rightKnee ? angles.leftKnee : angles.rightKnee;
            return backKneeAngle < 70;
          }
          return false;
        },
        feedback: '后膝不要碰到地面，保持适当高度',
        severity: 'warning'
      },
      {
        id: 'leaning_forward',
        name: '身体过度前倾',
        check: (keypoints, angles) => {
          const leftShoulder = keypoints.left_shoulder;
          const leftHip = keypoints.left_hip;
          const rightShoulder = keypoints.right_shoulder;
          const rightHip = keypoints.right_hip;

          if (!leftShoulder || !leftHip || !rightShoulder || !rightHip) return false;

          const leftLean = Math.abs(leftShoulder.y - leftHip.y);
          const rightLean = Math.abs(rightShoulder.y - rightHip.y);
          const avgLean = (leftLean + rightLean) / 2;

          return avgLean < 60;
        },
        feedback: '身体不要过度前倾，请保持上半身直立',
        severity: 'warning'
      }
    ]
  }
};

export class FormEvaluator {
  constructor() {
    this.currentExercise = null;
    this.phaseHistory = [];
  }

  setExercise(exerciseId) {
    this.currentExercise = EXERCISE_LIBRARY[exerciseId];
    this.phaseHistory = [];
  }

  evaluate(keypoints, angles) {
    if (!this.currentExercise) {
      return { valid: false, message: '未选择动作' };
    }

    const results = {
      valid: true,
      phase: null,
      phaseFeedback: null,
      mistakes: [],
      angles: angles,
      overallScore: 100
    };

    const phase = this.detectPhase(angles);
    results.phase = phase;

    if (phase) {
      const phaseResult = this.checkPhase(phase, angles);
      results.phaseFeedback = phaseResult.feedback;
      if (!phaseResult.isGood) {
        results.overallScore -= 20;
      }
    }

    for (const mistake of this.currentExercise.commonMistakes) {
      try {
        const hasMistake = mistake.check(keypoints, angles);
        if (hasMistake) {
          results.mistakes.push({
            ...mistake,
            detected: true
          });

          if (mistake.severity === 'error') {
            results.overallScore -= 30;
          } else {
            results.overallScore -= 15;
          }
        }
      } catch (e) {
        console.error('检查错误时出错:', e);
      }
    }

    results.overallScore = Math.max(0, results.overallScore);
    results.status = this.getStatusFromScore(results.overallScore);

    return results;
  }

  detectPhase(angles) {
    if (!this.currentExercise || !angles) return null;

    const standards = this.currentExercise.standards;
    let bestPhase = null;
    let bestMatch = 0;

    for (const [phaseName, phaseData] of Object.entries(standards)) {
      let matchScore = 0;
      let checkedAngles = 0;

      for (const [angleName, angleRange] of Object.entries(phaseData.angles)) {
        const currentAngle = angles[angleName];
        if (currentAngle !== null) {
          checkedAngles++;
          if (currentAngle >= angleRange.min && currentAngle <= angleRange.max) {
            matchScore++;
          }
        }
      }

      if (checkedAngles > 0) {
        const matchPercent = matchScore / checkedAngles;
        if (matchPercent > bestMatch) {
          bestMatch = matchPercent;
          bestPhase = phaseName;
        }
      }
    }

    if (bestMatch >= 0.5) {
      this.phaseHistory.push(bestPhase);
      if (this.phaseHistory.length > 10) {
        this.phaseHistory.shift();
      }
      return bestPhase;
    }

    return null;
  }

  checkPhase(phaseName, angles) {
    const phaseData = this.currentExercise.standards[phaseName];
    if (!phaseData) return { isGood: false, feedback: '未知阶段' };

    let allGood = true;
    const issues = [];

    for (const [angleName, angleRange] of Object.entries(phaseData.angles)) {
      const currentAngle = angles[angleName];
      if (currentAngle !== null) {
        if (currentAngle < angleRange.min || currentAngle > angleRange.max) {
          allGood = false;
          const deviation = currentAngle - angleRange.ideal;
          issues.push(`${this.getAngleName(angleName)}: ${currentAngle}° (目标: ${angleRange.ideal}°)`);
        }
      }
    }

    return {
      isGood: allGood,
      feedback: allGood ? phaseData.feedback.good : phaseData.feedback.improve,
      issues: issues
    };
  }

  getAngleName(angleKey) {
    const names = {
      leftKnee: '左膝',
      rightKnee: '右膝',
      leftHip: '左髋',
      rightHip: '右髋',
      leftShoulder: '左肩',
      rightShoulder: '右肩',
      leftElbow: '左肘',
      rightElbow: '右肘'
    };
    return names[angleKey] || angleKey;
  }

  getStatusFromScore(score) {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warning';
    return 'error';
  }

  getRepetition() {
    if (this.phaseHistory.length < 5) return 0;

    let reps = 0;
    let inBottom = false;

    for (let i = 1; i < this.phaseHistory.length; i++) {
      const prev = this.phaseHistory[i - 1];
      const current = this.phaseHistory[i];

      if ((prev === 'bottom' || prev === 'descent') && current === 'standing') {
        if (inBottom) {
          reps++;
          inBottom = false;
        }
      }

      if (current === 'bottom') {
        inBottom = true;
      }
    }

    return reps;
  }
}
