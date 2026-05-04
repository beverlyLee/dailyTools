export class AngleCalculator {
  static calculateAngle(pointA, pointB, pointC) {
    if (!pointA || !pointB || !pointC) {
      return null;
    }

    if (pointA.score < 0.3 || pointB.score < 0.3 || pointC.score < 0.3) {
      return null;
    }

    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y
    };

    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y
    };

    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;

    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);

    if (magnitudeBA === 0 || magnitudeBC === 0) {
      return null;
    }

    let cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    cosAngle = Math.max(-1, Math.min(1, cosAngle));

    const angleInRadians = Math.acos(cosAngle);
    const angleInDegrees = angleInRadians * (180 / Math.PI);

    return Math.round(angleInDegrees * 10) / 10;
  }

  static calculateKneeAngle(hip, knee, ankle) {
    return this.calculateAngle(hip, knee, ankle);
  }

  static calculateHipAngle(shoulder, hip, knee) {
    return this.calculateAngle(shoulder, hip, knee);
  }

  static calculateShoulderAngle(hip, shoulder, elbow) {
    return this.calculateAngle(hip, shoulder, elbow);
  }

  static calculateElbowAngle(shoulder, elbow, wrist) {
    return this.calculateAngle(shoulder, elbow, wrist);
  }

  static calculateAllAngles(keypoints) {
    const angles = {};

    angles.leftKnee = this.calculateKneeAngle(
      keypoints.left_hip,
      keypoints.left_knee,
      keypoints.left_ankle
    );

    angles.rightKnee = this.calculateKneeAngle(
      keypoints.right_hip,
      keypoints.right_knee,
      keypoints.right_ankle
    );

    angles.leftHip = this.calculateHipAngle(
      keypoints.left_shoulder,
      keypoints.left_hip,
      keypoints.left_knee
    );

    angles.rightHip = this.calculateHipAngle(
      keypoints.right_shoulder,
      keypoints.right_hip,
      keypoints.right_knee
    );

    angles.leftShoulder = this.calculateShoulderAngle(
      keypoints.left_hip,
      keypoints.left_shoulder,
      keypoints.left_elbow
    );

    angles.rightShoulder = this.calculateShoulderAngle(
      keypoints.right_hip,
      keypoints.right_shoulder,
      keypoints.right_elbow
    );

    angles.leftElbow = this.calculateElbowAngle(
      keypoints.left_shoulder,
      keypoints.left_elbow,
      keypoints.left_wrist
    );

    angles.rightElbow = this.calculateElbowAngle(
      keypoints.right_shoulder,
      keypoints.right_elbow,
      keypoints.right_wrist
    );

    return angles;
  }

  static isAngleWithinRange(angle, targetAngle, tolerance = 15) {
    if (angle === null || targetAngle === null) {
      return false;
    }
    return Math.abs(angle - targetAngle) <= tolerance;
  }

  static getAngleDeviation(angle, targetAngle) {
    if (angle === null || targetAngle === null) {
      return null;
    }
    return angle - targetAngle;
  }

  static calculateSymmetry(angle1, angle2) {
    if (angle1 === null || angle2 === null) {
      return null;
    }
    return Math.abs(angle1 - angle2);
  }
}

export class SymmetryChecker {
  static checkKneeSymmetry(angles) {
    const deviation = AngleCalculator.calculateSymmetry(angles.leftKnee, angles.rightKnee);
    if (deviation === null) return { symmetric: false, deviation: null, message: '无法检测膝盖角度' };
    
    const isSymmetric = deviation < 15;
    return {
      symmetric: isSymmetric,
      deviation: deviation,
      message: isSymmetric ? '膝盖角度对称' : `膝盖角度偏差 ${deviation}°，请注意平衡`
    };
  }

  static checkHipSymmetry(angles) {
    const deviation = AngleCalculator.calculateSymmetry(angles.leftHip, angles.rightHip);
    if (deviation === null) return { symmetric: false, deviation: null, message: '无法检测髋部角度' };
    
    const isSymmetric = deviation < 15;
    return {
      symmetric: isSymmetric,
      deviation: deviation,
      message: isSymmetric ? '髋部角度对称' : `髋部角度偏差 ${deviation}°，请注意平衡`
    };
  }

  static checkShoulderSymmetry(angles) {
    const deviation = AngleCalculator.calculateSymmetry(angles.leftShoulder, angles.rightShoulder);
    if (deviation === null) return { symmetric: false, deviation: null, message: '无法检测肩部角度' };
    
    const isSymmetric = deviation < 15;
    return {
      symmetric: isSymmetric,
      deviation: deviation,
      message: isSymmetric ? '肩部角度对称' : `肩部角度偏差 ${deviation}°，请注意平衡`
    };
  }

  static checkOverallSymmetry(angles) {
    const kneeCheck = this.checkKneeSymmetry(angles);
    const hipCheck = this.checkHipSymmetry(angles);
    const shoulderCheck = this.checkShoulderSymmetry(angles);

    const issues = [];
    if (!kneeCheck.symmetric && kneeCheck.deviation !== null) {
      issues.push(kneeCheck.message);
    }
    if (!hipCheck.symmetric && hipCheck.deviation !== null) {
      issues.push(hipCheck.message);
    }
    if (!shoulderCheck.symmetric && shoulderCheck.deviation !== null) {
      issues.push(shoulderCheck.message);
    }

    return {
      isBalanced: issues.length === 0,
      issues: issues,
      details: {
        knee: kneeCheck,
        hip: hipCheck,
        shoulder: shoulderCheck
      }
    };
  }
}
